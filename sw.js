/*
 * Cronos.wtf — service worker
 *
 * Stratégie minimaliste et low-risk :
 *
 *   • Stale-while-revalidate pour les assets statiques de l'app
 *     (index.html, styles.css, icônes, manifest). Sert vite depuis
 *     le cache, fetch en arrière-plan pour la prochaine fois.
 *
 *   • Network-only pour tout ce qui est API live (Crypto.com NFT
 *     GraphQL, Crypto.com Exchange, Firebase Realtime DB, media
 *     CDN). Données qui doivent rester fraîches — pas de cache.
 *
 *   • Au activate on purge les anciens caches (CACHE_NAME bumpé).
 *
 * Pour pousser une nouvelle version : bump CACHE_VERSION ci-dessous,
 * push, le SW se réinstalle et clean l'ancien cache au prochain reload.
 */

'use strict';

const CACHE_VERSION = 'v43';
const CACHE_NAME    = 'cronos-wtf-' + CACHE_VERSION;

/* Liste des assets statiques pré-cachés à l'install pour offline-ready
   instantané. On ne pré-cache PAS index.html car le navigateur le fetch
   en navigation directe (et le SW l'intercepte via la stratégie
   stale-while-revalidate ci-dessous). */
const PRECACHE_URLS = [
    '/styles.css',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-192-maskable.png',
    '/icons/icon-512-maskable.png',
    '/icons/apple-touch-icon.png',
    '/icons/favicon-32.png'
];

/* Hôtes dont les requêtes ne passent JAMAIS par le cache —
   API live, médias dynamiques, télémétrie. */
const NETWORK_ONLY_HOSTS = [
    'crypto.com',
    'api.crypto.com',
    'media.nft.crypto.com',
    'uat-api.3ona.co',
    'firebaseio.com',
    'firebase.googleapis.com',
    'googleapis.com',
    'gstatic.com'
];

function isNetworkOnly(url) {
    try {
        const host = new URL(url).hostname;
        return NETWORK_ONLY_HOSTS.some(h => host === h || host.endsWith('.' + h));
    } catch (e) {
        return false;
    }
}

function isSameOriginAsset(url) {
    try {
        const u = new URL(url);
        if (u.origin !== self.location.origin) return false;
        const p = u.pathname;
        return p === '/'
            || p === '/index.html'
            || p === '/styles.css'
            || p === '/manifest.webmanifest'
            || p.startsWith('/icons/');
    } catch (e) {
        return false;
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys.filter(k => k !== CACHE_NAME)
                .map(k => caches.delete(k))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    /* On ne touche QUE les requêtes GET — POST / PUT / etc. passent
       directement au réseau (mutations API, etc.). */
    if (req.method !== 'GET') return;

    /* Network-only pour les hôtes dynamiques connus. */
    if (isNetworkOnly(req.url)) return;

    /* Stale-while-revalidate uniquement pour les assets statiques
       same-origin qu'on sert nous-même. Le reste passe en réseau
       direct (tracker, fonts CDN tiers, etc.). */
    if (!isSameOriginAsset(req.url)) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        /* ignoreSearch: true — la requête depuis index.html arrive avec
           `?v=1778620000` (cache buster) alors que le precache stocke
           `/styles.css` sans query string. Sans ce flag, le precache
           n'est jamais hit au 1er chargement et le SWR fetche cold le
           fichier. */
        const cached = await cache.match(req, { ignoreSearch: true });
        const fetchPromise = fetch(req).then(res => {
            /* On ne cache que les réponses 200 OK basic — les
               opaque / 5xx / 404 ne servent à rien. */
            if (res && res.status === 200 && res.type === 'basic') {
                cache.put(req, res.clone()).catch(err => {
                    /* Log au lieu d'avaler silencieusement — utile
                       pour debugger un quota exceeded, permission
                       denied, etc. (avant on n'aurait pas su que
                       cache.put avait échoué). */
                    console.warn('[SW] cache.put failed:', err && err.message);
                });
            }
            return res;
        }).catch(err => {
            /* Si offline et pas de cache → laisser remonter le
               navigateur affiche son écran offline. On log juste
               l'erreur pour debug. */
            if (!cached) console.warn('[SW] fetch failed (no cache):', req.url, err && err.message);
            return cached;
        });
        return cached || fetchPromise;
    })());
});

/* Message handler pour permettre à la page de forcer un skipWaiting
   manuel via postMessage({type: 'SKIP_WAITING'}) si on veut faire
   un "update banner" → "Reload" plus tard. */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
