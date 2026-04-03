// sw.js — TiMat Service Worker minimal
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'TiMat', body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'TiMat', {
    body: data.body || '', vibrate: [200, 100, 200], data: { url: data.url || '/' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
