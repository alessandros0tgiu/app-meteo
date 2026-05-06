import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'it',
    debug: false,
    interpolation: {
      escapeValue: false, 
    },
    resources: {
      it: {
        translation: {
          "title": "🌤 Meteo",
          "search_placeholder": "Cerca una città...",
          "search_btn": "Cerca",
          "welcome_msg": "Inserisci una città o usa la tua posizione per scoprire il meteo.",
          "loading": "Recupero dati...",
          "next_hours": "🕐 Prossime ore",
          "seven_days": "📅 7 Giorni",
          "day": "☀️ Giorno",
          "night": "🌙 Notte",
          "chart_label": "Andamento temperatura",
          "error_location": "Località non trovata.",
          "use_position": "Usa la mia posizione"
        }
      },
      en: {
        translation: {
          "title": "🌤 Weather",
          "search_placeholder": "Search a city...",
          "search_btn": "Search",
          "welcome_msg": "Enter a city or use your location to discover the weather.",
          "loading": "Fetching data...",
          "next_hours": "🕐 Next hours",
          "seven_days": "📅 7 Days",
          "day": "☀️ Day",
          "night": "🌙 Night",
          "chart_label": "Temperature trend",
          "error_location": "Location not found.",
          "use_position": "Use my location"
        }
      }
    }
  });

export default i18n;