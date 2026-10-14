/**
 * Tuition ERP Progressive Web App (PWA) Service Worker
 * Handles offline caching, static asset delivery, and network failover
 */

const CACHE_NAME = "tuition-erp-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manifest.json",
];

// 1. INSTALL EVENT - Pre-cache App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching App Shell...");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Pre-cache partial warning:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Purging legacy cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT - Network-First for Navigation, Stale-While-Revalidate for Static Chunks
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore chrome-extension or non-HTTP requests
  if (!req.url.startsWith("http")) return;

  // Navigation requests (HTML pages)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            return cached || caches.match("/index.html");
          });
        })
    );
    return;
  }

  // Static Assets (JS, CSS, SVGs, Fonts)
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Fallback default network request
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

