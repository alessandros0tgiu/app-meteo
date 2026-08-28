import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { WeatherEffects } from "./WeatherEffects";
import { WeatherChart } from "./WeatherChart";
import "./App.css";
import "./i18n"; 

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

// Mappa i codici meteo WMO usati da Open-Meteo in una descrizione testuale
// compatibile con getIcon() (che cerca parole come "rain", "cloud", "snow", ecc.)
const mapOpenMeteoCode = (code: number): string => {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Mist";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
};

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
      let forecastDays: ForecastDay[] = data.forecast.forecastday.map((d: any) => ({
        date: d.date, max: d.day.maxtemp_c, min: d.day.mintemp_c, condition: d.day.condition.text
      }));

      // Il piano free di WeatherAPI limita il forecast a 3 giorni: se ne mancano,
      // li completiamo con Open-Meteo (gratuito, senza key, forecast fino a 16 giorni)
      if (forecastDays.length < 7) {
        try {
          const lat = data.location.lat;
          const lon = data.location.lon;
          const omRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
          );
          const omData = await omRes.json();
          const existingDates = new Set(forecastDays.map((d) => d.date));
          const extraDays: ForecastDay[] = omData.daily.time
            .map((date: string, i: number) => ({
              date,
              max: omData.daily.temperature_2m_max[i],
              min: omData.daily.temperature_2m_min[i],
              condition: mapOpenMeteoCode(omData.daily.weathercode[i]),
            }))
            .filter((d: ForecastDay) => !existingDates.has(d.date));
          forecastDays = [...forecastDays, ...extraDays].slice(0, 7);
        } catch {
          // Se anche Open-Meteo fallisce, mostriamo comunque i giorni disponibili da WeatherAPI
        }
      }

      setForecast(forecastDays);
      setHourly(data.forecast.forecastday[0].hour.map((h: any) => ({
        time: h.time, temp: h.temp_c, condition: h.condition.text
      })));
      if (!isSilent) {
        setCity("");
        setSuggestions([]);
      }
    } catch (err: any) { 
      setError(err.message || (i18n.language.startsWith('it') ? "Città non trovata!" : "City not found!")); 
    } finally { setLoading(false); }
  };

  // --- LOGICA CONDIZIONI PER EFFETTI ---
  const condition = weather?.condition?.toLowerCase() || "";
  const isRaining = condition.includes("rain") || condition.includes("pioggia") || condition.includes("drizzle");
  const isStorm = condition.includes("thunder") || condition.includes("storm") || condition.includes("temporale");
  const isSnowing = condition.includes("snow") || condition.includes("neve");
  const isCloudy = condition.includes("cloud") || condition.includes("nuvol") || condition.includes("overcast") || condition.includes("coperto");
  
  const isBadWeather = isRaining || isStorm || isSnowing;

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

        {/* Messaggio di Errore Custom con Classi CSS Pure */}
        {error && (
          <div className="error-wrapper">
            <div className="error-box">
              <div className="error__icon">
                <svg fill="none" height={24} viewBox="0 0 24 24" width={24} xmlns="http://www.w3.org/2000/svg">
                  <path d="m13 13h-2v-6h2zm0 4h-2v-2h2zm-1-15c-1.3132 0-2.61358.25866-3.82683.7612-1.21326.50255-2.31565 1.23915-3.24424 2.16773-1.87536 1.87537-2.92893 4.41891-2.92893 7.07107 0 2.6522 1.05357 5.1957 2.92893 7.0711.92859.9286 2.03098 1.6651 3.24424 2.1677 1.21325.5025 2.51363.7612 3.82683.7612 2.6522 0 5.1957-1.0536 7.0711-2.9289 1.8753-1.8754 2.9289-4.4189 2.9289-7.0711 0-1.3132-.2587-2.61358-.7612-3.82683-.5026-1.21326-1.2391-2.31565-2.1677-3.24424-.9286-.92858-2.031-1.66518-3.2443-2.16773-1.2132-.50254-2.5136-.7612-3.8268-.7612z" fill="#393a37" />
                </svg>
              </div>
              <div className="error__title">{error}</div>
              <div className="error__close" onClick={() => setError("")}>
                <svg height={20} viewBox="0 0 20 20" width={20} xmlns="http://www.w3.org/2000/svg">
                  <path d="m15.8333 5.34166-1.175-1.175-4.6583 4.65834-4.65833-4.65834-1.175 1.175 4.65833 4.65834-4.65833 4.6583 1.175 1.175 4.65833-4.6583 4.6583 4.6583 1.175-1.175-4.6583-4.6583z" fill="#393a37" />
                </svg>
              </div>
            </div>
          </div>
        )}
        
        {loading && (
          <div className="loader-container">
            <svg className="pl" viewBox="0 0 160 160" width="160px" height="160px" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000"></stop>
                  <stop offset="100%" stopColor="#fff"></stop>
                </linearGradient>
                <mask id="mask1">
                  <rect x="0" y="0" width="160" height="160" fill="url(#grad)"></rect>
                </mask>
                <mask id="mask2">
                  <rect x="28" y="28" width="104" height="104" fill="url(#grad)"></rect>
                </mask>
              </defs>
              <g>
                <g className="pl__ring-rotate">
                  <circle className="pl__ring-stroke" cx="80" cy="80" r="72" fill="none" stroke="hsl(223,90%,55%)" strokeWidth="16" strokeDasharray="452.39 452.39" strokeDashoffset="452" strokeLinecap="round" transform="rotate(-45,80,80)"></circle>
                </g>
              </g>
              <g mask="url(#mask1)">
                <g className="pl__ring-rotate">
                  <circle className="pl__ring-stroke" cx="80" cy="80" r="72" fill="none" stroke="hsl(193,90%,55%)" strokeWidth="16" strokeDasharray="452.39 452.39" strokeDashoffset="452" strokeLinecap="round" transform="rotate(-45,80,80)"></circle>
                </g>
              </g>
              <g>
                <g strokeWidth="4" strokeDasharray="12 12" strokeDashoffset="12" strokeLinecap="round" transform="translate(80,80)">
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(-135,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(-90,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(-45,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(0,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(45,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(90,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(135,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(180,0,0) translate(0,40)"></polyline>
                </g>
              </g>
              <g mask="url(#mask1)">
                <g strokeWidth="4" strokeDasharray="12 12" strokeDashoffset="12" strokeLinecap="round" transform="translate(80,80)">
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(-135,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(-90,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(-45,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(0,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(45,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(90,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(135,0,0) translate(0,40)"></polyline>
                  <polyline className="pl__tick" stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(180,0,0) translate(0,40)"></polyline>
                </g>
              </g>
              <g>
                <g transform="translate(64,28)">
                  <g className="pl__arrows" transform="rotate(45,16,52)">
                    <path fill="hsl(3,90%,55%)" d="M17.998,1.506l13.892,43.594c.455,1.426-.56,2.899-1.998,2.899H2.108c-1.437,0-2.452-1.473-1.998-2.899L14.002,1.506c.64-2.008,3.356-2.008,3.996,0Z"></path>
                    <path fill="hsl(223,10%,90%)" d="M14.009,102.499L.109,58.889c-.453-1.421,.559-2.889,1.991-2.889H29.899c1.433,0,2.444,1.468,1.991,2.889l-13.899,43.61c-.638,2.001-3.345,2.001-3.983,0Z"></path>
                  </g>
                </g>
              </g>
              <g mask="url(#mask2)">
                <g transform="translate(64,28)">
                  <g className="pl__arrows" transform="rotate(45,16,52)">
                    <path fill="hsl(333,90%,55%)" d="M17.998,1.506l13.892,43.594c.455,1.426-.56,2.899-1.998,2.899H2.108c-1.437,0-2.452-1.473-1.998-2.899L14.002,1.506c.64-2.008,3.356-2.008,3.996,0Z"></path>
                    <path fill="hsl(223,90%,80%)" d="M14.009,102.499L.109,58.889c-.453-1.421,.559-2.889,1.991-2.889H29.899c1.433,0,2.444,1.468,1.991,2.889l-13.899,43.61c-.638,2.001-3.345,2.001-3.983,0Z"></path>
                  </g>
                </g>
              </g>
            </svg>
          </div>
        )}

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