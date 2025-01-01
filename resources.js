import 'dotenv/config';
import { tables, Resource } from 'harperdb';
import { populateAirports } from './helpers.js';

// Populate the table with the data from the CSV file
if (server.workerIndex == 0) {
  await populateAirports();
}

/**
 * Gets all airports by country code
 * - GET /AirportsByCountry?country_code=US
 * @param {Object} query - The query object
 * @param {string} query.country_code - The country code
 * @returns {AsyncIterable<Array>} The airports by country code
 */
class AirportsByCountry extends Resource {
  async get(query) {
    const countryCode = query?.get?.('country_code');

    if (!countryCode) {
      return [];
    }

    const results = tables.AirportCode.search({
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
class CheckTravelWeather extends Resource {
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
 * Gets the latest forecast data for the subscription
 * - GET /ForecastSubscription
 * @param {Object} query - The query object
 * @returns {Promise<Object>} The latest forecast for the airport
 */
class ForecastSubscription extends tables.ForecastSubscription {
  async get(query) {
    // Get the latest forecast for the airport
    const forecast = await getForecastByAirport(this.airportId, this.date);

    // Join the latest temperature to this record in case it has changed
    // since the subscription was created
    this.latestTemperature = forecast?.temperature ?? this.temperature;

    return super.get(query);
  }

  // Override to intercept the message and add custom fields
  async subscribe(subRequest, context) {
    const iterator = await super.subscribe(subRequest, context);

    return {
      async *[Symbol.asyncIterator]() {
        for await (const message of iterator) {
          if (message.value) {
            message.value.messageId = crypto.randomUUID();
          }
          yield message;
        }
      },
    };
  }
}

/**
 * Subscribes a user to the forecast for a given airport and date
 * - POST /SubscribeToForecast
 * - GET /Subscriber/f5563f78-5c42-4d17-8383-06c61a7642cf?select(id,forecasts)
 * @param {Object} data - The data to subscribe to the forecast for
 * @param {string} data.sessionID - The session ID
 * @param {Object} data.departingAirportWeather - The departing airport weather
 * @param {Object} data.arrivingAirportWeather - The arriving airport weather
 * @returns {Promise<Object>} The user's subscriptions
 */
class SubscribeToForecast extends Resource {
  async post(data, context) {
    // data matches return value of CheckTravelWeather
    const { sessionID, departingAirportWeather, arrivingAirportWeather } = data;

    let forecastId;

    // Subscribe the user to the forecast
    await transaction(async (tx) => {
      await tables.Subscriber.put(
        {
          id: sessionID,
        },
        tx
      );

      ForecastSubscription.create(
        {
          subscriberId: sessionID,
          airportId: departingAirportWeather.airport.id,
          date: departingAirportWeather.date,
          temperature: departingAirportWeather.temperature,
        },
        tx
      );

      // This forecast will be used to mock a forecast update
      forecastId = await ForecastSubscription.create(
        {
          subscriberId: sessionID,
          airportId: arrivingAirportWeather.airport.id,
          date: arrivingAirportWeather.date,
          temperature: arrivingAirportWeather.temperature,
        },
        tx
      );

      mockForecastUpdatePush(forecastId);
    });

    // Return the user's subscriptions
    return tables.Subscriber.search(
      {
        id: sessionID,
        select: [
          'id',
          {
            name: 'forecasts',
            select: ['id', 'airport', 'date', 'temperature'],
          },
        ],
      },
      context
    );
  }
}

/**
 * Gets the forecast for an airport by airport id and date
 * @param {string} airportId - The airport id
 * @param {string} date - The date
 * @returns {Promise<Object>} The forecast for the airport
 */
async function getForecastByAirport(airportId, date) {
  if (!airportId || !date) {
    logger.error(`Missing airportId or date`);
    return null;
  }

  // Get the coordinates of the airport
  const airport = await tables.AirportCode.get(airportId);

  if (!airport) {
    return null;
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

/**
 * Mock a forecast update since the API doesn't offer a way to subscribe to updates
 * @param {string} forecastId - The forecast id
 */
function mockForecastUpdatePush(forecastId) {
  setTimeout(async () => {
    transaction(async (tx) => {
      const forecast = await ForecastSubscription.get(forecastId, tx);

      // Modify the temperature +/- 3 degrees
      const newTemperature =
        forecast.temperature + Math.floor(Math.random() * 3) - 1;

      await ForecastSubscription.patch(
        forecastId,
        {
          temperature: newTemperature,
        },
        tx
      );
    });
  }, 15000);
}

export {
  AirportsByCountry,
  CheckTravelWeather,
  SubscribeToForecast,
  ForecastSubscription,
};

// TODO: Attempt to create an endpoint that can be subscribed to
// by a subscriberId that then subscribes to the associated resources.
// class LiveForecastSubscriptionUpdate extends Resource {
//   static async subscribe(subRequest, context) {
//     const subscriberId = subRequest.search.split('=')[1];

//     if (!subscriberId) {
//       return;
//     }

//     console.log('subscriberId', subscriberId);
//     const subscriptions = LiveForecastSubscription.search({
//       select: ['id'],
//       conditions: [{ attribute: 'subscriberId', value: subscriberId }],
//     });

//     const resources = [];
//     for await (const subscription of subscriptions) {
//       console.log('subscription', subscription);
//       const resource = await LiveForecastSubscription.getResource(
//         subscription.id,
//         context
//       );
//       console.log('resource', resource);
//       resources.push(resource);
//     }

//     // Create and return an AsyncIterable that merges updates from all resources
//     const iterators = [];
//     for (const resource of resources) {
//       const iterator = await resource.subscribe(subRequest);
//       console.log('iterator', iterator);
//       iterators.push(iterator);
//     }

//     console.log('iterators', iterators);

//     return {
//       async *[Symbol.asyncIterator]() {
//         for (const iterator of iterators) {
//           for await (const update of iterator) {
//             yield update;
//           }
//         }
//       },
//     };
//   }
// }
