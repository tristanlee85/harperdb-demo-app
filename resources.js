import 'dotenv/config';
import csv from 'csvtojson';
import { databases, tables, Resource } from 'harperdb';

// export class MyCustomResource extends tables.TableName {
// 	// we can define our own custom POST handler
// 	post(content) {
// 		// do something with the incoming content;
// 		return super.post(content);
// 	}
// 	// or custom GET handler
// 	get() {
// 		// we can modify this resource before returning
// 		return super.get();
// 	}
// }

// we can also define a custom resource without a specific table
export class Greeting extends Resource {
  // a "Hello, world!" handler
  get() {
    return { greeting: 'Hello, world!' };
  }
}

const { AirportCode } = tables;
export class AirportCodeSource extends Resource {
  async get(query) {
    const code = query?.get?.('iata');

    if (!code) {
      return {};
    }

    const resp = await fetch(
      `https://raw.githubusercontent.com/ip2location/ip2location-iata-icao/refs/heads/master/iata-icao.csv`
    );
    const data = await resp.text();
    const json = await csv().fromString(data);

    return json.filter(
      (item) => item.iata.toUpperCase() === code.toUpperCase()
    );
  }
}
AirportCode.sourcedFrom(AirportCodeSource, { expiration: 3600 });

// Gets all airports by country code
export class AirportsByCountry extends Resource {
  async get(query) {
    const countryCode = query?.get?.('country_code');

    if (!countryCode) {
      return [];
    }

    const results = AirportCode.search({
      select: ['iata', 'airport', 'latitude', 'longitude'],
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
