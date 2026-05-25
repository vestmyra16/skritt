const CACHE_NAME = 'tursporer-app-v1';
const MAP_CACHE = 'kart-tiles-v1';

// Filer som trengs for å starte appen offline
const ASSETS = [
    './',
    './index.html',
    './icon_ny_v2.png',
    './manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Installer og lagre hovedfilene i minnet
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Fang opp all trafikk (som en dørvakt)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // SPESIALHÅNDTERING FOR KARTVERKET:
    if (url.hostname.includes('kartverket.no')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // 1. Har vi kartbildet i minnet (offline)? Gi det tilbake umiddelbart!
                if (cachedResponse) {
                    return cachedResponse;
                }
                // 2. Hvis vi ikke har det, og vi har internett: Last det ned og LAGRE det til neste gang!
                return fetch(event.request).then((networkResponse) => {
                    // Sjekk at vi fikk et gyldig bilde før vi lagrer
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(MAP_CACHE).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }).catch(() => {
                    // Hvis vi er offline og ikke har bildet, send tilbake en tom feilmelding fremfor at appen krasjer
                    return new Response('', { status: 404, statusText: 'Offline' });
                });
            })
        );
    } else {
        // STANDARDHÅNDTERING FOR RESTEN AV APPEN (html, css, js)
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
    }
});
