import 'dotenv/config';
import csv from 'csvtojson';
import { databases, tables, Resource } from 'harperdb';

const { AirportCode } = tables;

// Populate the table with the data from the CSV file
(async () => {
  // Check to see if the table is empty before populating it
  let count = 0;
  const records = await AirportCode.search({
    select: ['id'],
    limit: 1,
  });

  for await (const _ of records) {
    count++;
  }

  if (count > 0) {
    logger.info('AirportCode table is not empty, skipping population');
    return;
  }

  const resp = await fetch(
    `https://raw.githubusercontent.com/ip2location/ip2location-iata-icao/refs/heads/master/iata-icao.csv`
  );
  const data = await resp.text();
  const json = await csv().fromString(data);

  logger.info(
    `Populating ${json.length} records into the AirportCode table...`
  );
  await transaction((txn) => {
    for (const item of json) {
      AirportCode.create(item, txn);
    }
  });
  logger.info('Finished populating the AirportCode table');
})();

/**
 * Gets all airports by country code
 * - GET /AirportsByCountry?country_code=US
 * @param {Object} query - The query object
 * @param {string} query.country_code - The country code
 * @returns {AsyncIterable<Array>} The airports by country code
 */
export class AirportsByCountry extends Resource {
  async get(query) {
    const countryCode = query?.get?.('country_code');

    if (!countryCode) {
      return [];
    }

    const results = AirportCode.search({
      select: ['id', 'iata', 'airport', 'latitude', 'longitude'],
      operator: 'and',
      conditions: [
        // NOTE: this only appears to filter out empty attributes if it's the first condition
        {
          attribute: 'iata',
          comparator: 'not_equal',
          value: '',
        },
        {
          attribute: 'country_code',
          value: countryCode,
        },
      ],
      sort: {
        attribute: 'iata',
      },
    });

    // NOTE: If I iterate over the results, I need to return the array instead of the
    // AsyncIterable since it throws an error trying to serialize a completed transaction.
    // e.g., Error: Can not iterate on range with transaction that is already done
    // const records = [];
    // for await (const record of results) {
    //   records.push(record);
    // }
    // return records;

    return results;
  }
}

/**
 * Checks the weather for a departing and arriving airport for a given date
 * - POST /CheckTravelWeather
 * @param {Object} data - The data to check the weather for
 * @param {string} data.departingAirport - The departing airport id
 * @param {string} data.arrivingAirport - The arriving airport id
 * @param {string} data.departingDate - The departing date
 * @param {string} data.arrivingDate - The arriving date
 * @returns {Promise<Object>} The weather for the departing and arriving airports
 */
export class CheckTravelWeather extends Resource {
  async post(data) {
    const { departingAirport, arrivingAirport, departingDate, arrivingDate } =
      data;

    // Get both departing and arriving airport weather
    const [departingAirportWeather, arrivingAirportWeather] = await Promise.all(
      [
        getForecastByAirport(departingAirport, departingDate),
        getForecastByAirport(arrivingAirport, arrivingDate),
      ]
    );

    return { departingAirportWeather, arrivingAirportWeather };
  }
}

/**
 * Gets the forecast for an airport by airport id and date
 * @param {string} airportId - The airport id
 * @param {string} date - The date
 * @returns {Promise<Object>} The forecast for the airport
 */
async function getForecastByAirport(airportId, date) {
  const invalidResult = {};

  if (!airportId || !date) {
    logger.error(`Missing airportId or date`);
    return invalidResult;
  }

  // Get the coordinates of the airport
  const airport = await AirportCode.get(airportId);

  if (!airport) {
    return invalidResult;
  }

  const parsedDate = new Date(date);
  const { latitude, longitude } = airport;

  // Fetch the weather forecast for the airport
  const results = await fetch(
    `${process.env.OPENWEATHER_API_URL}?lat=${latitude}&lon=${longitude}&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`
  );
  const json = await results.json();

  // Reduce the data to include only the date and temperature
  const forecast = json.list.map((item) => ({
    airport,
    date: new Date(item.dt * 1000).toISOString(),
    temperature: Math.round(item.main.temp),
  }));

  // Filter the item closest to the provided date
  const closestDate = forecast.reduce((closest, item) => {
    const diff = Math.abs(new Date(item.date) - parsedDate);
    return diff < Math.abs(new Date(closest.date) - parsedDate)
      ? item
      : closest;
  }, forecast[0]);

  return closestDate;
}
