# ZöTok Kanban PWA

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
