/**
 * Mershal Service Worker — Network-first strategy
 *
 * - Navigation requests: network-first with offline fallback
 * - Static assets (/assets/*): cache-first
 * - API requests (/api/*): network-only (never cache)
 */

const CACHE_NAME = "mershal-v1";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS_TO_PRECACHE = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
];

// Install: precache offline page + key assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS_TO_PRECACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Only handle http/https requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // API calls: always go to network, never cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets: cache-first
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached ?? fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
      )
    );
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then((offline) => offline ?? new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request).catch(() => 
      caches.match(event.request).then((cached) => cached ?? new Response("Network error", { status: 408 }))
    )
  );
});
