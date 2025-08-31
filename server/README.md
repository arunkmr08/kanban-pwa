# Minimal Express API for Kanban PWA

Endpoints (in-memory storage):
- GET `/funnels` — returns funnels with nested groups and cards
- POST `/groups` — body: `{ name, description?, mode, color?, funnelId }`
- PATCH `/groups/:id` — body: `{ name? , funnelId?, cardOrder?: string[] }`
- DELETE `/groups/:id`
- PATCH `/cards/:id` — body: `{ groupId?, position? }`

Run locally:
```
cd server
npm i
npm start
# API runs on http://localhost:8080
```

Docker:
```
docker build -t kanban-pwa-api ./server
docker run -p 8080:8080 kanban-pwa-api
```

Deploy (Render/Railway):
- Select Dockerfile in `server/`
- Set port to 8080

