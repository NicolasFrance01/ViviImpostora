const CACHE_NAME = 'vivi-impostora-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './manifest.webmanifest',
    './viviicono.png',
    './viviiconoapp.png',
    './vivimenu.png',
    './vivilibre.jpg',
    './vivitriste.png',
    './vivigenerica.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
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
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
