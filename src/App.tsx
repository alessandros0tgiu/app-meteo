import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { WeatherEffects } from "./WeatherEffects";
import { WeatherChart } from "./WeatherChart";
import "./App.css";
import "./i18n"; 

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

// --- TYPES ---
type Weather = {
  name: string; region: string; country: string; lat: number; lon: number;
  timezone: string; localtime: string; temp: number; temp_f: number;
  condition: string; icon: string; feelslike: number; wind: number;
  wind_dir: string; humidity: number; pressure: number; precip: number;
  uv: number; visibility: number; is_day: number;
}
type ForecastDay = { date: string; max: number; min: number; condition: string; }
type HourlyForecast = { time: string; temp: number; condition: string; }

export default function App() {
  const { t, i18n } = useTranslation();
  
  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isShake, setIsShake] = useState(false);

  // Torna alla schermata iniziale (Home)
  const goHome = () => {
    setWeather(null);
    setForecast([]);
    setHourly([]);
    setCity("");
    setError("");
  };

  // Aggiorna i dati quando cambia la lingua
  useEffect(() => {
    if (weather?.name) {
      getWeather(weather.name, true);
    }
  }, [i18n.language]);

  const getIcon = (text: string) => {
    const c = text.toLowerCase();
    if (c.includes("thunder") || c.includes("storm") || c.includes("temporale")) return "⛈️";
    if (c.includes("snow") || c.includes("neve")) return "❄️";
    if (c.includes("rain") || c.includes("pioggia") || c.includes("drizzle")) return "🌧️";
    if (c.includes("cloud") || c.includes("nuvol") || c.includes("overcast") || c.includes("coperto")) return "☁️";
    if (c.includes("sun") || c.includes("clear") || c.includes("sereno") || c.includes("sole")) return "☀️";
    if (c.includes("mist") || c.includes("fog") || c.includes("nebbia")) return "🌫️";
    return "🌤️";
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) return setError("Geolocalizzazione non supportata");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => getWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
      () => { setError("Permesso negato"); setLoading(false); }
    );
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (city.length < 2) return setSuggestions([]);
      try {
        const res = await fetch(`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${city}`);
        const data = await res.json();
        setSuggestions(data.map((item: any) => `${item.name}, ${item.country}`));
      } catch { setSuggestions([]); }
    };
    const tId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(tId);
  }, [city]);

  const getWeather = async (selectedCity: string, isSilent = false) => {
    const query = selectedCity.trim();
    
    // Errore se l'input è vuoto
    if (!query && !isSilent) {
      setError(i18n.language.startsWith('it') ? "Inserisci una città!" : "Enter a city!");
      setIsShake(true);
      setTimeout(() => setIsShake(false), 400);
      return;
    }

    if (!query) return;
    const currentLang = i18n.language.split('-')[0];

    try {
      if (!isSilent) setLoading(true);
      setError("");
      const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&lang=${currentLang}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(t("error_location"));

      setWeather({
        name: data.location.name, region: data.location.region, country: data.location.country,
        lat: data.location.lat, lon: data.location.lon, timezone: data.location.tz_id,
        localtime: data.location.localtime, temp: data.current.temp_c, temp_f: data.current.temp_f,
        condition: data.current.condition.text, icon: data.current.condition.icon,
        feelslike: data.current.feelslike_c, wind: data.current.wind_kph, wind_dir: data.current.wind_dir,
        humidity: data.current.humidity, pressure: data.current.pressure_mb,
        precip: data.current.precip_mm, uv: data.current.uv, visibility: data.current.vis_km,
        is_day: data.current.is_day
      });
      setForecast(data.forecast.forecastday.map((d: any) => ({
        date: d.date, max: d.day.maxtemp_c, min: d.day.mintemp_c, condition: d.day.condition.text
      })));
      setHourly(data.forecast.forecastday[0].hour.map((h: any) => ({
        time: h.time, temp: h.temp_c, condition: h.condition.text
      })));
      if (!isSilent) {
        setCity("");
        setSuggestions([]);
      }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  // --- LOGICA CONDIZIONI PER EFFETTI ---
  const condition = weather?.condition?.toLowerCase() || "";
  const isRaining = condition.includes("rain") || condition.includes("pioggia") || condition.includes("drizzle");
  const isStorm = condition.includes("thunder") || condition.includes("storm") || condition.includes("temporale");
  const isSnowing = condition.includes("snow") || condition.includes("neve");
  const isCloudy = condition.includes("cloud") || condition.includes("nuvol") || condition.includes("overcast") || condition.includes("coperto");
  
  const isBadWeather = isRaining || isStorm || isSnowing;

  // Fix Madrid: il sole appare se è giorno, non piove/nevica e la stringa contiene termini di "sereno" (IT/EN)
  const isSunny = Number(weather?.is_day) === 1 && 
                  !isBadWeather && 
                  (condition.includes("sun") || condition.includes("clear") || condition.includes("sereno") || condition.includes("sole"));

  const getType = () => {
    if (!weather) return "clear";
    if (isStorm || isRaining) return "rain";
    if (isCloudy) return "clouds";
    if (isSnowing) return "snow";
    return "clear";
  };

  return (
    <div className={`app ${getType()} ${weather?.is_day === 0 ? 'dark-mode' : 'light-mode'}`}>
      <WeatherEffects isSunny={isSunny} isCloudy={isCloudy} isRaining={isRaining} isStorm={isStorm} />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1 className="title" onClick={goHome} style={{ margin: 0, cursor: 'pointer' }}>
            {t("title")}
          </h1>
          <div className="lang-switcher">
            <button onClick={() => i18n.changeLanguage('it')} style={{ fontWeight: i18n.language.startsWith('it') ? 'bold' : 'normal' }}>IT</button>
            <button onClick={() => i18n.changeLanguage('en')} style={{ fontWeight: i18n.language.startsWith('en') ? 'bold' : 'normal' }}>EN</button>
          </div>
        </div>

        <div className={`search ${isShake ? 'shake' : ''}`}>
          <button className="geo-btn" onClick={getMyLocation}>📍</button>
          <input
            className={error ? "input-error" : ""}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if(error) setError("");
            }}
            placeholder={t("search_placeholder")}
            onKeyDown={(e) => e.key === "Enter" && getWeather(city)}
          />
          <button onClick={() => getWeather(city)}>{t("search_btn")}</button>
        </div>

        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s, i) => (
              <div key={i} onClick={() => { setCity(s); getWeather(s); }}>{s}</div>
            ))}
          </div>
        )}

        {error && <div className="error-container"><div className="error-content"><span>⚡</span><p>{error}</p></div></div>}
        {loading && <div className="status-container"><div className="spinner"></div><p>{t("loading")}</p></div>}

        {!weather && !loading && !error && (
          <div className="welcome-view" style={{ textAlign: 'center', padding: '20px' }}>
             <p style={{ opacity: 0.8 }}>{t("welcome_msg")}</p>
          </div>
        )}

        {weather && !loading && (
          <div className="weather">
            <h2>{weather.name}</h2>
            <img src={`https:${weather.icon}`} width={80} alt="icon" />
            <p className="temp">{Math.round(weather.temp)}°C</p>
            <p className="condition-text">{weather.condition}</p>

            <WeatherChart hourlyData={hourly} />

            <div className="grid">
              <div className="box">💨 {weather.wind} km/h</div>
              <div className="box">💧 {weather.humidity}%</div>
              <div className="box">☀️ UV {weather.uv}</div>
              <div className="box">{weather.is_day === 1 ? t("day") : t("night")}</div>
            </div>

            <div className="forecast">
              <h3>{t("next_hours")}</h3>
              <div className="forecast-grid scrollable-x">
                {hourly.slice(0, 24).map((h, i) => (
                  <div key={i} className="forecast-card small">
                    <p>{new Date(h.time).getHours()}:00</p>
                    <div style={{ fontSize: "20px" }}>{getIcon(h.condition)}</div>
                    <p>{Math.round(h.temp)}°</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="forecast">
              <h3>{t("seven_days")}</h3>
              <div className="forecast-grid scrollable-x">
                {forecast.map((d, i) => (
                  <div key={i} className="forecast-card">
                    <p>{new Date(d.date).toLocaleDateString(i18n.language, { weekday: "short" })}</p>
                    <div style={{ fontSize: "26px" }}>{getIcon(d.condition)}</div>
                    <p><strong>{Math.round(d.max)}°</strong> / {Math.round(d.min)}°</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}