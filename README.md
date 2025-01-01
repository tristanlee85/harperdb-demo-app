# HarperDB Demo App

This is a demo application built using [Next.js](https://nextjs.org) and HarperDB. The application provides real-time weather forecasts for flights, allowing users to check weather conditions for departing and arriving airports and subscribe to updates.

## Features

- **Real-Time Weather Forecasts**: Check and subscribe to weather forecasts for flights using the OpenWeather API.
- **Session Management**: Each user session is tracked using a unique session ID stored in the browser's local storage.
- **MQTT Integration**: Real-time updates are delivered using MQTT.
- **REST APIs**: The application uses HarperDB REST APIs for data fetching and manipulation.

## Getting Started

### Prerequisites

- Node.js
- npm
- HarperDB

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/tristanlee85/harperdb-demo-app.git
   cd harperdb-demo-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   The application requires an OpenWeather API key, which should be set in the `.env` file and should automatically be copied during the `npm install` step, but if it is not, you can create it by copying `.env.example` to `.env` and `app/.env`.

### Running the Application

To start the development server, run:

```bash
npm run dev
```

This will start HarperDB on http://localhost:9926 and the Next.js application at http://localhost:9926/app.

When HarperDB is started, the `AirportCode` table will be populated with airport codes from an external source if it is empty.

### Demo-ing the Application

To demo the application:

1. Open http://localhost:9926/app
2. Select departure and arrival airports, and the times of the flight.
3. Click **Check Flight Weather 🌦️** to fetch the weather forecast closest to the flight time.
4. Click **Subscribe for Updates** to subscribe to weather updates for the flight. This will create a `Subscriber` record and corresponding `ForecastSubscription` records for the forecast.
5. Wait for Updates: After subscribing, wait for approximately 15 seconds. The application will simulate a forecast update by modifying the temperature slightly. This is done to demonstrate the real-time update feature using MQTT as the OpenWeather API does not support real-time updates.
6. View Real-Time Updates: Any changes to the subscribed forecast will be displayed under the **Real-Time Forecast Updates** section. This is handled by the `LiveForecast` component, which connects to the MQTT broker and listens for messages on the subscribed topics.

## Additional Information

### Application Structure

- **Frontend**: The application is built using Next.js. The main page is located in `app/src/app/page.js`.
- **Backend**: The backend logic is implemented using HarperDB's custom resources in `resources.js`. Key resources include:
  - `AirportsByCountry`: Fetches airport data based on the country code.
  - `CheckTravelWeather`: Retrieves weather forecasts for specified airports and times.
  - `ForecastSubscription`: Handles joining of external forecast data to the forecast subscription record to obtain the latest temperature. It also overrides the `subscribe()` method to intercept messages for adding custom fields.
  - `SubscribeToForecast`: Used to create a `Subscriber` record and corresponding `ForecastSubscription` records for the forecast.
- **Real-Time Updates**: The application uses MQTT for real-time updates. The `LiveForecast` component subscribes to forecast topics and displays updates as they are received.
