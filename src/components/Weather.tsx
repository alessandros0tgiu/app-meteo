import { useState } from "react";
import { getWeather } from "../services/weatherService";
import "./Weather.css";

export default function Weather() {
  const [city, setCity] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const searchWeather = async () => {
    if (!city.trim()) return;

    try {
      setLoading(true);
      setError("");
      setData(null);

      const result = await getWeather(city);
      setData(result);
    } catch {
      setError("Città non trovata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <div className="card">

        <h1 className="title">Weather App</h1>

        <div className="search">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Inserisci città..."
            onKeyDown={(e) => e.key === "Enter" && searchWeather()}
          />

          <button onClick={searchWeather}>
            Cerca
          </button>
        </div>

        {loading && <p className="info">Caricamento...</p>}

        {error && <p className="error">{error}</p>}

        {data && (
          <div className="result">

            <h2>{data.location.name}</h2>

            <div className="temp">
              {data.current.temp_c}°
            </div>

            <p>{data.current.condition.text}</p>

            <img
              src={data.current.condition.icon}
              alt="weather"
            />

            <div className="grid">

              <div className="box">
                <span>Umidità</span>
                <b>{data.current.humidity}%</b>
              </div>

              <div className="box">
                <span>Vento</span>
                <b>{data.current.wind_kph} km/h</b>
              </div>

              <div className="box">
                <span>Percepita</span>
                <b>{data.current.feelslike_c}°</b>
              </div>

              <div className="box">
                <span>Pressione</span>
                <b>{data.current.pressure_mb}</b>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}