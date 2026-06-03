import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The backend lives at https://dato.statistikam.uz/api and exposes both REST
// and a Socket.IO endpoint at /api/socket.io. During local dev we proxy /api
// to it so the browser talks same-origin (no CORS) and socket.io upgrades work.
const API_TARGET = process.env.VITE_API_TARGET || 'https://dato.statistikam.uz'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
})
