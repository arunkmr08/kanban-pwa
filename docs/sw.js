const CACHE = 'kanban-pwa-cache-v1';
self.addEventListener('install', (e) => {
  const BASE = self.registration.scope; // e.g., https://user.github.io/kanban-pwa/
  const assets = ['.', 'index.html', 'manifest.webmanifest'].map(p => new URL(p, BASE).toString());
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return resp;
      }).catch(() => cached);
    })
  );
});
