'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [airports, setAirports] = useState([]);
  const [formData, setFormData] = useState({
    departingAirport: '',
    arrivingAirport: '',
    departingTime: '',
    arrivingTime: '',
  });
  const [weather, setWeather] = useState({
    // departingAirportWeather: {
    //   airport: {
    //     country_code: 'US',
    //     region_name: 'Ohio',
    //     iata: 'CMH',
    //     icao: 'KCMH',
    //     airport: 'John Glenn Columbus International Airport',
    //     latitude: '39.998',
    //     longitude: '-82.8919',
    //     id: 'f55a968d-f840-4640-8445-66ce9368fef0',
    //   },
    //   date: '2024-12-31T00:00:00.000Z',
    //   temperature: 44.53,
    // },
    // arrivingAirportWeather: {
    //   airport: {
    //     country_code: 'US',
    //     region_name: 'California',
    //     iata: 'LAX',
    //     icao: 'KLAX',
    //     airport: 'Los Angeles International Airport',
    //     latitude: '33.9425',
    //     longitude: '-118.408',
    //     id: 'f830cbdd-4e75-4cc0-994d-927f1560ce7b',
    //   },
    //   date: '2024-12-31T03:00:00.000Z',
    //   temperature: 56.62,
    // },
  });
  const [error, setError] = useState('');

  useEffect(() => {
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
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
      //       {
      //     "departingAirportWeather": {
      //         "date": "2024-12-31T00:00:00.000Z",
      //         "temperature": 44.53
      //     },
      //     "arrivingAirportWeather": {
      //         "date": "2024-12-31T03:00:00.000Z",
      //         "temperature": 56.62
      //     }
      // }
      setWeather(result);
    } catch (error) {
      console.error('Error submitting form:', error);
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
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.formLabel}>
              Departing Airport:
              <select
                className={styles.formSelect}
                name="departingAirport"
                value={formData.departingAirport}
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
                required
              />
            </label>
            {error && (
              <p style={{ color: 'red', gridColumn: 'span 2' }}>{error}</p>
            )}
            <button className={styles.button} type="submit">
              Check Travel Weather 🌦️
            </button>
          </form>
        </div>
        {weather && (
          <div className={styles.weather}>
            <h2>Airport Forecast</h2>
            <div className={styles.forecast}>
              <h3>Departing Forecast</h3>
              <p>Airport: {weather.departingAirportWeather.airport.iata}</p>
              <p>
                Temperature: {weather.departingAirportWeather.temperature}°F
              </p>
              <p>Time: {weather.departingAirportWeather.date}</p>
            </div>
            <div className={styles.forecast}>
              <h3>Arriving Forecast</h3>
              <p>Airport: {weather.arrivingAirportWeather.airport.iata}</p>
              <p>Temperature: {weather.arrivingAirportWeather.temperature}°F</p>
              <p>Time: {weather.arrivingAirportWeather.date}</p>
            </div>
            <button className={styles.subscribeButton}>
              Subscribe for Updates
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
