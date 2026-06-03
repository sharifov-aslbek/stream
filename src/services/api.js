import axios from 'axios'

// Where the backend actually lives.
const BACKEND_ORIGIN = 'https://dato.statistikam.uz'

// In dev, an empty base lets the Vite proxy forward /api same-origin (no CORS).
// In a production build (e.g. Netlify) there is no proxy, so we must hit the
// backend directly. VITE_API_BASE still overrides both when set.
const BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? BACKEND_ORIGIN : '')

const http = axios.create({
  baseURL: BASE,
  headers: { Accept: 'application/json' },
})

// Origin that actually serves the uploaded images. Unlike REST/socket (which go
// through the dev proxy via an empty BASE), uploaded logos must resolve to a real
// host so they also load outside the dev server (e.g. an OBS browser source).
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || BACKEND_ORIGIN

// Turn a relative logoUrl ("/api/uploads/x.png") into an absolute URL so it loads
// regardless of where the overlay page itself is hosted.
export function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${ASSET_BASE}${path}`
}

export const api = {
  // ---- Polls ----
  listPolls: () => http.get('/api/polls').then((r) => r.data),
  getPoll: (id) => http.get(`/api/polls/${id}`).then((r) => r.data),
  createPoll: (title) => http.post('/api/polls', { title }).then((r) => r.data),
  deletePoll: (id) => http.delete(`/api/polls/${id}`).then((r) => r.data),
  activatePoll: (id) => http.post(`/api/polls/${id}/activate`).then((r) => r.data),
  deactivatePoll: (id) => http.post(`/api/polls/${id}/deactivate`).then((r) => r.data),
  resetPoll: (id) => http.post(`/api/polls/${id}/reset`).then((r) => r.data),

  // ---- Poll items ----
  addItem: (pollId, formData) =>
    http.post(`/api/polls/${pollId}/items`, formData).then((r) => r.data),
  deleteItem: (pollId, itemId) =>
    http.delete(`/api/polls/${pollId}/items/${itemId}`).then((r) => r.data),

  // ---- Participants ----
  listParticipants: (pollId) =>
    http.get(`/api/polls/${pollId}/participants`).then((r) => r.data),
  addParticipant: (pollId, formData) =>
    http.post(`/api/polls/${pollId}/participants`, formData).then((r) => r.data),
  updateParticipant: (pollId, participantId, pollItemId) =>
    http
      .patch(`/api/polls/${pollId}/participants/${participantId}`, { pollItemId })
      .then((r) => r.data),
  deleteParticipant: (pollId, participantId) =>
    http.delete(`/api/polls/${pollId}/participants/${participantId}`).then((r) => r.data),

  // ---- Chat listener ----
  chatStart: (videoId) => http.post('/api/chat/start', { videoId }).then((r) => r.data),
  chatStop: () => http.post('/api/chat/stop').then((r) => r.data),
  chatStatus: () => http.get('/api/chat/status').then((r) => r.data),
  chatMessages: () => http.get('/api/chat/messages').then((r) => r.data),
  simulateVote: (authorName, message) =>
    http.post('/api/chat/simulate-vote', { authorName, message }).then((r) => r.data),

  // ---- Overlay ----
  getOverlay: () => http.get('/api/overlay').then((r) => r.data),
}
