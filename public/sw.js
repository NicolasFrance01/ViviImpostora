const CACHE_NAME = 'pepe-impostor-v2'; // Incrementado para forzar actualización
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './manifest.webmanifest',
    './pepeicono.png',
    './pepemenu.png',
    './pepelibre.png',
    './pepetriste.png',
    './imagengenerica.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Forzar activación inmediata
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Estrategia: Network First para archivos críticos, Cache para resto
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
