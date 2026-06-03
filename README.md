# NexusPoll — Vue 3

YouTube stream poll system frontend for the NexusPoll API (`https://dato.statistikam.uz/api`).
Two views in one app:

- **Dashboard** (`/#/dashboard`) — create/activate polls, manage items (teams) & participants,
  control the YouTube chat listener, watch the live chat feed and vote bars in real time.
- **Overlay** (`/#/overlay`) — transparent, OBS-ready scoreboard matching the red/spider design:
  participant cards on top, a versus vote bar at the bottom, and live "just voted" flashes.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

The dev server proxies `/api` (REST + socket.io) to the backend, so no CORS setup is needed.

### Config (`.env`)

| Var | Meaning |
|-----|---------|
| `VITE_API_TARGET` | Backend the dev proxy forwards to. Default `https://dato.statistikam.uz`. |
| `VITE_API_BASE`   | Base URL the app calls. Empty = same origin (uses the proxy / prod host). Set to the full backend URL to bypass the proxy. |

## Build

```bash
npm run build    # outputs to dist/
npm run preview
```

## OBS setup

Add a **Browser Source** pointing at the deployed `…/#/overlay` URL, sized to your canvas
(e.g. 1920×1080). The page background is transparent. The white box in the bottom row is a
facecam placeholder — position your webcam source over it.

## How real-time works

The app keeps a single shared socket (`/api/socket.io`) and reacts to:
`poll:vote` (instant bar update), `poll:status`, `poll:reset`, `chat:message`,
`chat:status`, and `overlay:flush` (every 5s buffer write → re-fetch authoritative counts).

## Structure

```
src/
  services/  api.js        axios client for every documented endpoint
             socket.js     shared socket.io connection + on() helper
  components/ PollList, ItemManager, ParticipantManager,
              ChatControl, ChatFeed, LogoBadge, SpiderLogo
  views/      Dashboard.vue   admin
              Overlay.vue     OBS scoreboard
```
