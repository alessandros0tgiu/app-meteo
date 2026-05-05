import { useState, useEffect } from "react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import "./App.css"

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY

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
  const [city, setCity] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [weather, setWeather] = useState<Weather | null>(null)
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [hourly, setHourly] = useState<HourlyForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (city.length > 0) setError("");
  }, [city]);

  // 🌤 ICONA METEO PERSONALIZZATA (Emoji)
  const getIcon = (text: string) => {
    const c = text.toLowerCase()
    if (c.includes("thunder") || c.includes("storm") || c.includes("temporale")) return "⛈️"
    if (c.includes("snow") || c.includes("neve")) return "❄️"
    if (c.includes("rain") || c.includes("pioggia") || c.includes("drizzle")) return "🌧️"
    if (c.includes("cloud") || c.includes("nuvol")) return "☁️"
    if (c.includes("sun") || c.includes("clear") || c.includes("sereno")) return "☀️"
    if (c.includes("mist") || c.includes("fog") || c.includes("nebbia")) return "🌫️"
    return "🌤️"
  }

  // --- 📍 GEOLOCALIZZAZIONE ---
  const getMyLocation = () => {
    if (!navigator.geolocation) return setError("Geolocalizzazione non supportata");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => getWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
      () => { setError("Permesso negato"); setLoading(false); }
    );
  };

  // --- EFFETTI VISIVI (Sfondi animati) ---
  const Rain = () => (
    <div className="rain-container">
      {Array.from({ length: 80 }).map((_, i) => (
        <span key={i} className="raindrop" style={{ left: `${Math.random() * 100}%`, animationDuration: `${0.4 + Math.random()}s`, opacity: Math.random() }} />
      ))}
    </div>
  )
  const Lightning = () => <div className="lightning" />
  const SunGlow = () => <div className="sun-glow" />
  const Clouds = () => (
    <div className="clouds-container"><div className="cloud c1"></div><div className="cloud c2"></div><div className="cloud c3"></div></div>
  )

  const condition = weather?.condition?.toLowerCase() || ""
  const isRaining = condition.includes("rain") || condition.includes("pioggia")
  const isStorm = condition.includes("thunder") || condition.includes("storm")
  const isCloudy = condition.includes("cloud") || condition.includes("nuvol")
  const isBadWeather = isRaining || isStorm || condition.includes("snow")
  const isSunny = Number(weather?.is_day) === 1 && !isBadWeather && (condition.includes("sun") || condition.includes("clear"))

  // --- AUTOCOMPLETE ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (city.length < 2) return setSuggestions([])
      try {
        const res = await fetch(`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${city}`)
        const data = await res.json()
        setSuggestions(data.map((item: any) => `${item.name}, ${item.country}`))
      } catch { setSuggestions([]) }
    }
    const t = setTimeout(fetchSuggestions, 300); return () => clearTimeout(t)
  }, [city])

  const getWeather = async (selectedCity: string) => {
    const query = selectedCity.trim();
    if (!query) { setError("Specificare una località."); return; }
    try {
      setLoading(true); setError(""); setSuggestions([]);
      const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&lang=it`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error("Località non trovata.");

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
      setCity("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  const getType = () => {
    if (!weather) return "clear"
    if (isStorm) return "rain"
    if (condition.includes("rain")) return "rain"
    if (condition.includes("cloud")) return "clouds"
    if (condition.includes("snow")) return "snow"
    return "clear"
  }

  return (
    <div className={`app ${getType()} ${weather?.is_day === 0 ? 'dark-mode' : 'light-mode'}`}>
      {isSunny && <SunGlow />}
      {isCloudy && !isRaining && <Clouds />}
      {(isRaining || isStorm) && <Rain />}
      {isStorm && <Lightning />}

      <div className="card">
        <h1 className="title">🌤 Meteo</h1>

        <div className="search">
          <button className="geo-btn" onClick={getMyLocation} title="Usa la mia posizione">📍</button>
          <input
            className={error ? "input-error" : ""}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cerca una città..."
            onKeyDown={(e) => e.key === "Enter" && getWeather(city)}
          />
          <button onClick={() => getWeather(city)}>Cerca</button>
        </div>

        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s, i) => (
              <div key={i} onClick={() => { setCity(s); getWeather(s); }}>{s}</div>
            ))}
          </div>
        )}

        {error && <div className="error-container"><div className="error-content"><span>⚡</span><p>{error}</p></div></div>}
        {loading && <div className="status-container"><div className="spinner"></div><p>Recupero dati...</p></div>}

        {!weather && !loading && !error && (
          <div className="welcome-view">
            <div className="welcome-icon">🌍</div>
            <h2>Ciao!</h2>
            <p>Inserisci una città o usa la tua posizione per scoprire il meteo.</p>
          </div>
        )}

        {weather && !loading && (
          <div className="weather">
            <h2>{weather.name}</h2>
            <img src={`https:${weather.icon}`} width={80} alt="icon" />
            <p className="temp">{Math.round(weather.temp)}°C</p>
            <p className="condition-text">{weather.condition}</p>

            {/* 📊 GRAFICO TEMPERATURE ORARIE */}
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={hourly.filter((_, i) => i % 2 === 0)}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="temp" stroke="var(--accent)" fill="url(#colorTemp)" strokeWidth={3} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="chart-label">Andamento oggi</p>
            </div>

            <div className="grid">
              <div className="box">💨 {weather.wind} km/h</div>
              <div className="box">💧 {weather.humidity}%</div>
              <div className="box">☀️ UV {weather.uv}</div>
              <div className="box">{weather.is_day === 1 ? "☀️ Giorno" : "🌙 Notte"}</div>
            </div>

            <div className="forecast">
              <h3>🕐 Prossime ore</h3>
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
              <h3>📅 7 Giorni</h3>
              <div className="forecast-grid">
                {forecast.map((d, i) => (
                  <div key={i} className="forecast-card">
                    <p>{new Date(d.date).toLocaleDateString("it-IT", { weekday: "short" })}</p>
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
  )
}