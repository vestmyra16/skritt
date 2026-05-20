const CACHE_NAME = 'tursporer-cache-v1';

// Filene som appen TRENGER for å i det hele tatt starte offline
const ASSETS_TO_CACHE = [
    './',
    './index.html', // Endre til det faktiske navnet på HTML-filen din hvis den heter noe annet
    './manifest.json',
    './icon_ny_v2.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// 1. Installer Service Worker og lagre kjernefilene (skripter og stilark)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Kjernefiler lagret i cache!');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. Aktiver og slett gamle cacher hvis du oppdaterer appen senere
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Sletter gammel cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. "Cache-First" strategi med dynamisk bakgrunns-bufring av kartfliser
self.addEventListener('fetch', (event) => {
    // Vi bryr oss kun om GET-forespørsler (kart og filer)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Hvis filen (eller kartflisen) allerede ligger i minnet, bruk den umiddelbart!
            if (cachedResponse) {
                return cachedResponse;
            }

            // Hvis ikke, hent den fra nettet
            return fetch(event.request).then((networkResponse) => {
                // Sjekk at vi fikk et gyldig svar tilbake før vi lagrer det
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                // Siden vi bruker eksterne kilder (Kartverket/Unpkg), må vi klone svaret
                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    // Her lagres kartflisene automatisk i bakgrunnen etter hvert som du navigerer på kartet online!
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Hvis nettverket svikter og vi ikke har tingen i cache, skjer det ingenting (f.eks. tom kartrute)
            });
        })
    );
});
