import csv from 'csvtojson';
import { tables } from 'harperdb';

const { AirportCode } = tables;

export async function populateAirports() {
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
}
