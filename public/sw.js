// Service Worker for Мастерок PWA
// Caches static assets for offline access

const CACHE_NAME = "masterok-v3";
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.svg",
  "/apple-touch-icon.png",
];

// Install: cache only truly static assets (not HTML pages)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Check if response is valid HTML
function isHtmlResponse(response) {
  const ct = response.headers.get("content-type") || "";
  return ct.includes("text/html");
}

// Check if this is an RSC/flight request from Next.js client-side navigation
function isRscRequest(request) {
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  const url = new URL(request.url);
  if (url.searchParams.has("_rsc")) return true;
  return false;
}

// Fetch: network-first for pages, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, external requests, and RSC/flight requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (isRscRequest(request)) return;

  // Static assets (JS, CSS, fonts, images): cache-first
  if (url.pathname.startsWith("/_next/") || url.pathname.match(/\.(png|jpg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // HTML pages: network-first, fallback to cache
  // Only cache if response is actually HTML (prevents RSC payload poisoning)
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isHtmlResponse(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }
});
