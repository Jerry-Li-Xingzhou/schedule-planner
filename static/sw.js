// Service Worker for PWA — caches app shell for offline access

const CACHE_NAME = 'schedule-planner-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/api.js',
    '/js/app.js',
    '/js/calendar.js',
    '/js/gantt.js',
    '/js/notifications.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-180.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

// Service worker disabled — always go to network
self.addEventListener('fetch', () => {});
