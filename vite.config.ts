import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/app-meteo/', // <-- AGGIUNGI QUESTA RIGA (usa il nome esatto del tuo repo)
})