'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import LiveForecast from './components/LiveForecast';

export default function Home() {
  const [sessionID, setSessionID] = useState(null);
  const [airports, setAirports] = useState([]);
  const [formData, setFormData] = useState({
    departingAirport: '',
    arrivingAirport: '',
    departingTime: '',
    arrivingTime: '',
  });
  const [weather, setWeather] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptions, setSubscriptions] = useState(null);
  const [error, setError] = useState('');

  // Determine sessionID and fetch airports
  useEffect(() => {
    const sessionID = localStorage.getItem('sessionID');
    if (sessionID) {
      setSessionID(sessionID);
    } else {
      const newSessionID = crypto.randomUUID();
      localStorage.setItem('sessionID', newSessionID);
      setSessionID(newSessionID);
    }

    const fetchAirports = async () => {
      try {
        const response = await fetch('/AirportsByCountry?country_code=US');
        const data = await response.json();
        setAirports(data);
      } catch (error) {
        console.error('Error fetching airports:', error);
      }
    };

    fetchAirports();
  }, []);

  // Fetch subscriptions for this session
  useEffect(() => {
    if (sessionID) {
      const fetchSubscriptions = async () => {
        // NOTE: Occasionally, usually the first fetch after the server starts,
        // the array of forecasts has the correct length, but the one or more
        // forecast objects is an empty. This usually occurs when doing a
        // .get() (/Subscriber/{id}?select(id,forecasts{id,airport,date,temperature})).
        // Performing a .search() (/Subscriber/?id={id}&select(id,forecasts{id,airport,date,temperature}))
        // seems to fix the issue.

        const response = await fetch(
          `/Subscriber/?id=${sessionID}&select(id,forecasts{id,airport,date,temperature})`
        );

        if (!response.ok) {
          console.log('No subscriptions found');
          return;
        }

        // A collection is returned
        const data = await response.json();
        setSubscriptions(data[0]);
      };

      fetchSubscriptions();
    }
  }, [sessionID]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckWeather = async (e) => {
    e.preventDefault();
    setError('');

    // Time values are in HH:MM format and need to be date objects of tomorrow
    const departingDate = new Date(
      new Date().setDate(new Date().getDate() + 1)
    );
    departingDate.setHours(formData.departingTime.split(':')[0]);
    departingDate.setMinutes(formData.departingTime.split(':')[1]);
    const arrivingDate = new Date(new Date().setDate(new Date().getDate() + 1));
    arrivingDate.setHours(formData.arrivingTime.split(':')[0]);
    arrivingDate.setMinutes(formData.arrivingTime.split(':')[1]);

    if (departingDate >= arrivingDate) {
      setError('Arrival time must be later than the departure time.');
      return;
    }

    try {
      const response = await fetch('/CheckTravelWeather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          departingDate,
          arrivingDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit the form');
      }

      const result = await response.json();
      setWeather(result);
      setIsSubscribed(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/SubscribeToForecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionID,
          departingAirportWeather: weather.departingAirportWeather,
          arrivingAirportWeather: weather.arrivingAirportWeather,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data[0]);
        setIsSubscribed(true);
      } else {
        setError('Failed to subscribe to forecast');
      }
    } catch (error) {
      console.error('Error subscribing to forecast:', error);
    }
  };

  // Forecast data is every 3 hours; limit time to next day only
  const minTime = new Date().toISOString().split('T')[0]; // Today
  const maxTime = new Date(
    new Date(minTime).setDate(new Date(minTime).getDate() + 1)
  )
    .toISOString()
    .split('T')[0]; // Tomorrow

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <h1>Flight Weather Conditions</h1>
        <div className={styles.formContainer}>
          <form className={styles.form} onSubmit={handleCheckWeather}>
            <label className={styles.formLabel}>
              Departing Airport:
              <select
                className={styles.formSelect}
                name="departingAirport"
                value={formData.departingAirport}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>
                  Select Departing Airport
                </option>
                {airports.map((airport) => (
                  <option key={airport.iata} value={airport.id}>
                    {airport.iata} - {airport.airport}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formLabel}>
              Arriving Airport:
              <select
                className={styles.formSelect}
                name="arrivingAirport"
                value={formData.arrivingAirport}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>
                  Select Arriving Airport
                </option>
                {airports.map((airport) => (
                  <option key={airport.iata} value={airport.id}>
                    {airport.iata} - {airport.airport}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formLabel}>
              Departing Time:
              <input
                className={`${styles.formInput} ${styles.formDate}`}
                type="time"
                name="departingTime"
                min={minTime}
                max={maxTime}
                value={formData.departingTime}
                onChange={handleInputChange}
                required
              />
            </label>
            <label className={styles.formLabel}>
              Arriving Time:
              <input
                className={`${styles.formInput} ${styles.formDate}`}
                type="time"
                name="arrivingTime"
                min={minTime}
                max={maxTime}
                value={formData.arrivingTime}
                onChange={handleInputChange}
                required
              />
            </label>
            {error && (
              <p style={{ color: 'red', gridColumn: 'span 2' }}>{error}</p>
            )}
            <button className={styles.button} type="submit">
              Check Flight Weather 🌦️
            </button>
          </form>
        </div>
        {weather && (
          <>
            <hr className="divider" />
            <div className={styles.weather}>
              <div className={styles.forecast}>
                <div className={styles.forecastRow}>
                  <span className={styles.forecastLabel}>Departing:</span>
                  <span>{weather.departingAirportWeather.airport.iata}</span>
                </div>
                <div className={styles.forecastRow}>
                  <span className={styles.forecastLabel}>Temperature:</span>
                  <span>{weather.departingAirportWeather.temperature}°F</span>
                </div>
                <div className={styles.forecastRow}>
                  <span className={styles.forecastLabel}>Time:</span>
                  <span>
                    {formatTime(weather.departingAirportWeather.date)}
                  </span>
                </div>
              </div>
              <div className={styles.forecast}>
                <div className={styles.forecastRow}>
                  <span className={styles.forecastLabel}>Arriving:</span>
                  <span>{weather.arrivingAirportWeather.airport.iata}</span>
                </div>
                <div className={styles.forecastRow}>
                  <span className={styles.forecastLabel}>Temperature:</span>
                  <span>{weather.arrivingAirportWeather.temperature}°F</span>
                </div>
                <div className={styles.forecastRow}>
                  <span className={styles.forecastLabel}>Time:</span>
                  <span>{formatTime(weather.arrivingAirportWeather.date)}</span>
                </div>
              </div>

              <button
                className={styles.subscribeButton}
                onClick={handleSubscribe}
                disabled={isSubscribed}
              >
                {isSubscribed ? 'Subscribed!' : 'Subscribe for Updates'}
              </button>
            </div>
          </>
        )}

        {subscriptions?.forecasts?.length > 0 && (
          <>
            <hr className="divider" />
            <div className={styles.subscriptions}>
              <h2>Forecast Subscriptions</h2>
              {subscriptions.forecasts.map((forecast) => (
                <div key={forecast.id} className={styles.subscriptionItem}>
                  <span className={styles.subscriptionLabel}>
                    {forecast.airport.iata}
                  </span>
                  <span>{forecast.temperature}°F</span>
                  <span>{formatTime(forecast.date)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {sessionID && subscriptions && (
          <LiveForecast
            sessionID={sessionID}
            forecasts={subscriptions.forecasts}
          />
        )}
      </div>
    </div>
  );
}

function formatTime(time) {
  return new Date(time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
