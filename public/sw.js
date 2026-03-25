const CACHE_NAME = "radio-stream-pwa-v1";
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim().catch(() => {}));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches
      .match(request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const resToCache = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, resToCache))
            .catch(() => {});
          return res;
        });
      })
      .catch(() => {
        // Network offline fallback
        return caches.match(request);
      })
  );
});

