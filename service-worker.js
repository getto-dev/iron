// ==========================================
// GymPro Trainer — Service Worker v2.0
// Стратегия: stale-while-revalidate для статики,
// network-first для возможных обновлений
// ==========================================

const CACHE_VERSION = 'gympro-v2-0-0';
const CACHE_NAME = CACHE_VERSION;
const OFFLINE_URL = './index.html';

const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// === Установка: кэшируем ядро ===
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('[SW] Install error:', err))
    );
});

// === Активация: удаляем старые кэши ===
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys =>
                Promise.all(
                    keys.filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll({ type: 'window' }))
            .then(clients => clients.forEach(c => c.navigate && c.navigate(c.url)))
    );
});

// === Стратегии fetch ===
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Игнорируем non-GET
    if (req.method !== 'GET') return;

    // Игнорируем chrome-extension и внешние запросы
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;

    // Стратегия: stale-while-revalidate для статики
    event.respondWith(
        caches.match(req).then(cached => {
            const fetchPromise = fetch(req).then(networkRes => {
                // Обновляем кэш только при успешном ответе
                if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
                    const clone = networkRes.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                }
                return networkRes;
            }).catch(() => cached || caches.match(OFFLINE_URL));
            return cached || fetchPromise;
        })
    );
});

// === Обработка сообщений от клиента ===
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
