// Empire Cab Universal Service Worker for PWA & Background Push Notifications
const CACHE_NAME = 'empire-cab-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for push events
self.addEventListener('push', (event) => {
  let data = { title: 'Empire Cab Update', body: 'You have a new trip update.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'View Update' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click with direct tab navigation support
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawData = event.notification.data;
  let targetTab = 'inquiries';
  let targetUrl = '/admin?tab=inquiries';

  if (typeof rawData === 'string') {
    if (rawData.includes('tab=')) {
      try {
        const urlObj = new URL(rawData, self.location.origin);
        targetTab = urlObj.searchParams.get('tab') || 'inquiries';
      } catch (e) {}
    }
    targetUrl = rawData;
  } else if (rawData && typeof rawData === 'object') {
    targetTab = rawData.tab || 'inquiries';
    targetUrl = rawData.url || `/admin?tab=${targetTab}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Check if an admin window is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && (client.url.includes('admin') || client.url.includes('/admin')) && 'focus' in client) {
          client.postMessage({
            type: 'NAVIGATE_ADMIN_TAB',
            tab: targetTab,
            url: targetUrl
          });
          return client.focus();
        }
      }
      // 2. Otherwise open fresh window directly to target tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
