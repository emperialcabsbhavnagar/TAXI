// Empire Cab Universal Service Worker for PWA & Background Push Notifications
const CACHE_NAME = 'empire-cab-v3';

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
  let tag = 'disp-general';

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

  // Suppress upcoming trip alerts per user instruction
  if (title.includes('Upcoming') || title.includes('Scheduled Trip Today') || tag.includes('today') || tag.includes('rem30')) {
    return;
  }

  if (tag === 'disp-general') {
    tag = 'disp-' + (title + body).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  }

  const options = {
    body: body,
    icon: '/official-app-icon.png',
    badge: '/favicon.png',
    tag: tag,
    renotify: true,
    silent: false,
    data: url
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      return self.registration.showNotification(title, { body: body, data: url });
    })
  );
});

// Handle notification click with direct tab navigation and card highlight support
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawData = event.notification.data;
  let targetTab = 'inquiries';
  let targetHighlight = null;
  let targetUrl = '/admin?tab=inquiries';

  if (typeof rawData === 'string') {
    targetUrl = rawData;
    try {
      const urlObj = new URL(rawData, self.location.origin);
      targetTab = urlObj.searchParams.get('tab') || 'inquiries';
      targetHighlight = urlObj.searchParams.get('highlight') || null;
    } catch (e) {}
  } else if (rawData && typeof rawData === 'object') {
    targetTab = rawData.tab || 'inquiries';
    targetHighlight = rawData.highlight || rawData.inquiryId || rawData.messageId || null;
    targetUrl = rawData.url || `/admin?tab=${targetTab}${targetHighlight ? `&highlight=${targetHighlight}` : ''}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Check if an app window is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (client.url && (client.url.includes('admin') || client.url.includes('/admin'))) {
            client.postMessage({
              type: 'NAVIGATE_ADMIN_TAB',
              tab: targetTab,
              highlight: targetHighlight,
              url: targetUrl
            });
            return client.focus();
          } else {
            client.postMessage({
              type: 'NAVIGATE_CUSTOMER_TAB',
              tab: targetTab,
              highlight: targetHighlight,
              url: targetUrl
            });
            return client.focus();
          }
        }
      }
      // 2. Otherwise open fresh window directly to target tab & specific card
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
