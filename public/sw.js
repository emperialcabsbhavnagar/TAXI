// Empire Cab Universal Service Worker for PWA & Background Push Notifications
const CACHE_NAME = 'empire-cab-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for push events (iOS WebKit & Android Chrome resilient)
self.addEventListener('push', (event) => {
  let title = 'EMPERIAL CABS Alert';
  let body = 'New booking dispatch update received.';
  let url = '/admin?tab=inquiries';
  let tag = 'disp-' + Date.now();

  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed) {
        if (parsed.title) title = parsed.title;
        if (parsed.body) body = parsed.body;
        if (parsed.url) url = parsed.url;
        if (parsed.tag) tag = parsed.tag;
      }
    }
  } catch (e) {
    try {
      if (event.data) body = event.data.text() || body;
    } catch (e2) {}
  }

  const options = {
    body: body,
    icon: '/official-app-icon.png',
    badge: '/favicon.png',
    tag: tag,
    data: url
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      return self.registration.showNotification(title, { body: body, data: url });
    })
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
