/* PWA: app shell caching (same-origin only) */
'use strict';

const CACHE_NAME = 'pokemon-champions-shell-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './battle.html',
  './style.css',
  './app.js',
  './battle.js',
  './typeChart.js',
  './teamAnalyzer.js',
  './pokemonData.js',
  './manifest.webmanifest',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// Cache-first for same-origin GET requests (app shell)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    const res = await fetch(req);
    if (res && res.ok) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  })());
});

