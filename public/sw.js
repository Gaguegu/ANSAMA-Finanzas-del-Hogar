// Service Worker para ANSAMA Finanzas del Hogar
const CACHE_NAME = 'ansama-cache-v2.5.3';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.jpg',
  './logo.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './apple-touch-icon.png'
];

// Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación y limpieza inmediata de versiones antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones con tolerancia a fallos
self.addEventListener('fetch', (event) => {
  // Solo peticiones GET
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // Ignorar extensiones de navegador y peticiones no http/https
  if (!url.protocol.startsWith('http')) return;

  // En peticiones de navegación (recarga o cambio de página)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback a caché para asegurar que NUNCA se quede la pantalla en blanco
          const cached = 
            (await caches.match(event.request)) ||
            (await caches.match('./index.html')) ||
            (await caches.match('index.html')) ||
            (await caches.match('./')) ||
            (await caches.match('/'));
          
          if (cached) return cached;
          
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><title>ANSAMA</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;"><h2>ANSAMA Finanzas del Hogar</h2><p>Reiniciando la aplicación tras la actualización...</p><button onclick="window.location.reload()" style="padding:8px 16px;background:#0E6A3B;color:#fff;border:none;border-radius:8px;cursor:pointer;">Reintentar</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Peticiones de recursos estáticos (imágenes, scripts, etc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano intentamos refrescar si hay conexión
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
          })
          .catch(() => {
            // Silencioso si no hay red
          });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla y no está en caché
          return new Response(null, { status: 404, statusText: 'Not found' });
        });
    })
  );
});

// Recibir mensaje para forzar activación o limpieza
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    });
  }
});
