'use client';

import { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import styles from './LiveForecast.module.css';

function LiveForecast({ sessionID, forecasts }) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  // const [client, setClient] = useState(null);

  function subscribeToTopics(client, forecasts) {
    // Subscribe to all topics for this session
    // TODO: Is it possible to subscribe to relational topics (e.g. Subscriber/{id}/ForecastSubscription)
    // https://docs.harperdb.io/docs/developers/real-time#topics
    //const topics = [`Subscriber/${sessionID}`];

    // Subscribe to the individual forecasts
    const topics = forecasts.map(
      (forecast) => `ForecastSubscription/${forecast.id}`
    );

    if (topics.length > 0) {
      client.subscribe(topics, (err) => {
        if (err) {
          console.error('Subscription error:', err);
        } else {
          console.log(`Subscribed to ${topics.join(', ')}`);
        }
      });
    }
  }

  useEffect(() => {
    if (!forecasts.length) return;
    const client = mqtt.connect({
      host: 'localhost',
      port: 9926,
      protocol: 'ws',
    });
    console.log('client', client);

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnected(true);
      subscribeToTopics(client, forecasts);
    });

    client.on('message', (topic, message) => {
      const decoder = new TextDecoder('utf-8');
      const decodedString = decoder.decode(message);
      const update = JSON.parse(decodedString);
      update.receivedAt = new Date().toISOString();

      console.log(`Message received on ${topic}:`, update);
      setMessages((prev) => [...prev, update]);
    });

    client.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker');
    });

    client.on('close', () => {
      console.log('MQTT connection closed');
    });

    client.on('disconnect', () => {
      console.log('Disconnected from MQTT broker');
    });

    client.on('error', (err) => {
      console.error('Connection error:', err);
    });

    return () => {
      console.log('Disconnecting from MQTT broker');
      client.end();
    };
  }, [forecasts]);

  return (
    <>
      <hr className="divider" />
      <div>
        <h2 className={styles.header}>Real-Time Forecast Updates</h2>
        <div className={styles.description}>
          Changes to any subscribed forecast will be displayed below.
        </div>
        {!connected ? (
          <p>Connecting to MQTT broker...</p>
        ) : (
          <ul className={styles.messageList}>
            {messages.map((message) => (
              <li key={message.messageId} className={styles.messageItem}>
                <pre className={styles.messageContent}>
                  {JSON.stringify(message, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default LiveForecast;
