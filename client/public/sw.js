const CACHE_NAME = 'plataforma-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ═══ INSTALL ═══
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ═══ ACTIVATE ═══
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ═══ FETCH — Network first, fallback to cache ═══
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests — network only
  if (request.url.includes('/api/')) return;

  // Requisições para outros domínios (Google Fonts, Drive, YouTube) não passam
  // por aqui. Antes elas caíam no fallback de HTML lá embaixo e recebiam o
  // index.html no lugar do recurso: o CSS da fonte Inter chegava como
  // text/html e o browser recusava a folha de estilo inteira.
  if (new URL(request.url).origin !== self.location.origin) return;

  // Static assets — cache first
  if (request.url.match(/\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)(\?|$)/)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      )
    );
    return;
  }

  // Só navegação de página usa o index.html como rede-de-segurança offline.
  // Qualquer outro recurso segue direto para a rede: devolver HTML no lugar
  // de um CSS/JSON/imagem quebra a página em vez de salvá-la.
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});

// ═══ PUSH NOTIFICATIONS ═══
self.addEventListener('push', (event) => {
  let data = { title: 'Minha Plataforma', body: 'Nova notificação', icon: '/icon-192.png' };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      data: { url: data.url || '/' },
      actions: data.actions || [],
    })
  );
});

// ═══ NOTIFICATION CLICK ═══
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab or open new
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
