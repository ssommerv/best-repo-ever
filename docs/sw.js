// Offline support. When online, always load the newest code from the server
// (bypassing the browser's HTTP cache); fall back to the saved copy only when
// offline or the network is too slow. Images rarely change, so they are served
// from the saved copy first.
const CACHE = 'pvb-v6';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './img/hannah-splash.jpg', './img/hannah-head.jpg',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(ASSETS.map((url) => fetch(url, { cache: 'reload' }).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return c.put(url, res);
    }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isImage = (url) => /\.(png|jpe?g|svg|webp)$/i.test(url.pathname);

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = () => cache.match(e.request, { ignoreSearch: true })
      .then((r) => r || (e.request.mode === 'navigate' ? cache.match('./index.html') : undefined));
    const network = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (isImage(url)) return (await cached()) || network;
    // Network first, but don't leave her staring at a blank screen on a slow connection.
    const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
    try {
      const res = await Promise.race([network, timeout.then(cached)]);
      if (res) return res;
      return await network;
    } catch (err) {
      return (await cached()) || Response.error();
    }
  }));
});
