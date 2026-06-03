import { io } from 'socket.io-client'

const BACKEND_ORIGIN = 'https://dato.statistikam.uz'

// Same rule as the REST client: dev uses the Vite proxy (empty base), a
// production build connects straight to the backend. VITE_API_BASE overrides.
const BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? BACKEND_ORIGIN : '')

// A single shared socket for the whole app. The backend mounts socket.io at the
// custom path /api/socket.io. We allow both transports so it works behind the
// dev proxy and in production.
export const socket = io(BASE || undefined, {
  path: '/api/socket.io',
  transports: ['websocket', 'polling'],
  autoConnect: true,
})

// Convenience: register a listener and get back an unsubscribe function so
// components can clean up in onUnmounted without juggling handler references.
export function on(event, handler) {
  socket.on(event, handler)
  return () => socket.off(event, handler)
}
