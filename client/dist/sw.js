// Web Push Service Worker for ReserveHub
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'ReserveHub Notification', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 ReserveHub Alert';
  const options = {
    body: data.body || data.message || 'Campus booking status update.',
    icon: '/vite.svg',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
