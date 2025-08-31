# Kanban PWA

## Deployment and Backend

- Frontend is built with Vite and deployed to GitHub Pages from `main/docs`.
- Optional backend API lives in `server/` (Express). You can run it locally or deploy to Render/Railway.

### Run API locally

```
cd server
npm i
cp .env.example .env   # optional: set API_TOKEN and CORS_ORIGIN
npm start               # serves on http://localhost:8080
```

Set the frontend to talk to it during development:

```
echo "VITE_API_BASE_URL=http://localhost:8080" > .env.development
```

### Deploy API (Docker)

```
docker build -t kanban-pwa-api ./server
docker run -p 8080:8080 -e API_TOKEN=changeme -e CORS_ORIGIN=https://arunkmr08.github.io kanban-pwa-api
```

Then set the Pages build to use:

```
VITE_API_BASE_URL=https://<your-api-host>
VITE_API_TOKEN=changeme
```

### Supabase (optional)

- Schema: `supabase/schema.sql` (funnels, groups, cards with RLS).
- Client stub: `src/lib/supabase.ts` (set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).


A drag-and-drop Kanban board (Marketing/Sales/Conversations) with table view, customer details drawer, and Light/Dark/System theming. Built with **Vite + React + Tailwind** and works as a PWA (installable).

## Features
- Reorder **funnels (tabs)**, **groups**, and **cards** (dnd-kit)
- Move group to another funnel
- Pin/unpin card (always on top)
- Search + status filters (clickable chips)
- Per-column **Load more**
- Table view toggle
- Details drawer inspired by your reference
- Light/Dark/System theme (persisted to localStorage + responds to OS changes)
- Offline cache via a simple service worker + web manifest

## Getting Started
```bash
npm install
npm run dev
# then open http://localhost:5173
```

## Build
```bash
npm run build
npm run preview
```

## PWA
- A minimal service worker caches the app shell.
- Manifest is at `public/manifest.webmanifest`.
- Icons are placeholders; replace files in `public/icons/` with real 192x192 and 512x512 PNGs.
