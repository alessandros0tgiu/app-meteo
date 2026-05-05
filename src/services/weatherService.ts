const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

export async function getWeather(city: string) {
  if (!API_KEY) {
    throw new Error("API key mancante nel file .env");
  }

  const response = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(
      city
    )}&lang=it`
  );

  if (!response.ok) {
    throw new Error("Errore API");
  }

  return await response.json();
}