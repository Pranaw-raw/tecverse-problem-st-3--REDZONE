// Firebase Cloud Messaging & Web Push Service Worker for ReserveHub
self.addEventListener('install', (event) => {
  console.log('[Service Worker] ReserveHub FCM Push Worker Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] ReserveHub FCM Push Worker Activated');
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push message received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'ReserveHub Campus Alert', body: event.data.text() };
    }
  }

  const title = data.notification?.title || data.title || '🔔 New Campus Booking Alert';
  const options = {
    body: data.notification?.body || data.body || data.message || 'A new facility reservation has been placed on ReserveHub.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [200, 100, 200],
    tag: 'reservehub-booking-alert',
    renotify: true,
    data: {
      url: data.data?.url || '/',
      bookingId: data.data?.bookingId || data.bookingId
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click (Focus window or open Admin Dashboard)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
