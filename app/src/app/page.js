'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [airports, setAirports] = useState([]);
  const [formData, setFormData] = useState({
    departingAirport: '',
    arrivingAirport: '',
    departingDate: '',
    arrivingDate: '',
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

    if (new Date(formData.departingDate) >= new Date(formData.arrivingDate)) {
      setError('Arrival date must be later than the departure date.');
      return;
    }

    try {
      const response = await fetch('/api/resource_name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit the form');
      }

      const result = await response.json();
      console.log('submit response', result);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <h1>Flight Weather Conditions</h1>
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
                <option key={airport.iata} value={airport.iata}>
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
                <option key={airport.iata} value={airport.iata}>
                  {airport.iata} - {airport.airport}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formLabel}>
            Departing Date:
            <input
              className={`${styles.formInput} ${styles.formDate}`}
              type="date"
              name="departingDate"
              value={formData.departingDate}
              onChange={handleChange}
              required
            />
          </label>
          <label className={styles.formLabel}>
            Arriving Date:
            <input
              className={`${styles.formInput} ${styles.formDate}`}
              type="date"
              name="arrivingDate"
              value={formData.arrivingDate}
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
    </div>
  );
}
