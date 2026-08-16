const CACHE = 'defter-fetih-1.6.3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    ASSETS.map(async (url) => {
      try {
        await cache.add(url);
      } catch (_) {
        /* skip missing/redirect-only assets so install still succeeds */
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const navigate = req.mode === 'navigate' ||
    (same && (url.pathname.endsWith('/') || /\/index\.html$/.test(url.pathname)));

  if (navigate) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (!res || !res.ok) return res;
        if (same || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req));
    })
  );
});
