/**
 * Ecosystem Universal Notification Engine
 * Handles System Tray Push Notifications, Local Storage State Sync,
 * and Automated Ecosystem Pre-Trip Scheduler.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { saveNotificationToMySQL, markNotificationDeliveredInMySQL, savePushSubscriptionToMySQL } from './mysqlService';

const VAPID_PUBLIC_KEY = 'BNjJ7GWaU-7KXkdkyyxoTyNGCRFSztK8KNtPQW9BWDycOZyVpSJZB7PZJ74JfL0ZSS9DZtrgHPe-cE9U9qi23CY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register Apple APNs / Google FCM Push Manager Subscription & Save to Hostinger MySQL
export const registerWebPushSubscription = async (userType = 'admin') => {
  if (typeof window === 'undefined') return { success: false, error: 'No window context' };
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Web Push is not supported by this browser/OS.' };
  }

  try {
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission not granted' };
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js');
    }
    await navigator.serviceWorker.ready;
    registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return { success: false, error: 'Service worker not active' };
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      } catch (err) {
        console.warn('[WebPush] Initial subscribe failed, attempting clean re-subscribe:', err);
        const oldSub = await registration.pushManager.getSubscription();
        if (oldSub) {
          await oldSub.unsubscribe().catch(() => {});
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }
    }

    const subJson = subscription ? subscription.toJSON() : null;
    if (!subJson || !subJson.endpoint || !subJson.keys) {
      return { success: false, error: 'Failed to generate Web Push subscription payload' };
    }

    const payload = {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth
      },
      user_type: userType
    };

    const saved = await savePushSubscriptionToMySQL(payload);
    try {
      localStorage.setItem('cabsy_web_push_registered', 'true');
      localStorage.setItem('cabsy_web_push_endpoint', subJson.endpoint);
    } catch (e) {}

    return { success: true, savedInDb: saved, endpoint: subJson.endpoint };
  } catch (error) {
    console.error('[WebPush] Registration error:', error);
    return { success: false, error: error.message || String(error) };
  }
};

// Dispatch remote server-side push (Apple APNs / Google FCM) to all registered devices
export const triggerRemoteServerPush = async ({ title, body, url = '/admin?tab=inquiries', userType = 'admin', tag = null }) => {
  try {
    const endpoints = [
      '/api/send-push',
      '/api/send-push.php',
      'https://emperialcabs.com/api/send-push.php',
      'https://emperialcabs.com/api/send-push'
    ];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            url,
            userType,
            tag: tag || ('disp-' + Date.now())
          })
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json && json.success) return json;
        }
      } catch (err) {}
    }
  } catch (e) {
    console.warn('[WebPush] triggerRemoteServerPush notice:', e);
  }
  return null;
};

// Request system tray push notification permission
export const requestNotificationPermission = async () => {
  try {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      const check = await LocalNotifications.checkPermissions();
      if (check && check.display !== 'granted') {
        const res = await LocalNotifications.requestPermissions();
        return res && res.display === 'granted';
      }
      return true;
    }
  } catch (e) {
    console.warn("Capacitor request permission error:", e);
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    }
    return Notification.permission === 'granted';
  }
  return false;
};

// Global AudioContext cache with user gesture unlocking
let globalAudioCtx = null;

export const unlockAudio = () => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
  } catch (e) {}
};

// Auto-register touch/click listeners to unlock audio immediately upon any user gesture
if (typeof window !== 'undefined') {
  const tryUnlock = () => {
    unlockAudio();
  };
  ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
    window.addEventListener(evt, tryUnlock, { passive: true });
  });
}

// Play audible chime for dispatch & booking notifications
export const playChimeSound = () => {
  try {
    unlockAudio();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = globalAudioCtx || new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const t = audioCtx.currentTime;
    // Tone 1: D5 (587.33 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t);
    gain1.gain.setValueAtTime(0.6, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t);
    osc1.stop(t + 0.22);

    // Tone 2: A5 (880 Hz) - higher attention chime
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, t + 0.16);
    gain2.gain.setValueAtTime(0.6, t + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t + 0.16);
    osc2.stop(t + 0.45);
  } catch (e) {
    // If Web Audio blocked, silent fallback
  }
};

// Trigger Phone / Desktop System Tray Push Notification (Mobile Chrome / APK / PWA Compatible)
export const sendSystemPushNotification = async (title, body, tag = 'EMPERIAL CABS-notif', extraData = {}) => {
  playChimeSound();

  // Trigger device vibration if supported (pattern: 200ms vibrate, 100ms pause, 200ms vibrate)
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch (e) {}

  // 1. Mobile Phone Native System Notification Panel (Android APK via Capacitor LocalNotifications)
  try {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.createChannel({
          id: 'emperial_cabs_channel',
          name: 'EMPERIAL CABS Alerts',
          description: 'Live ride confirmation, driver details, and fleet alerts',
          importance: 5,
          visibility: 1,
          vibration: true
        });
      } catch (ce) {}

      try {
        await LocalNotifications.removeAllDeliveredNotifications();
      } catch (ce) {}

      const notifId = 1001;
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: notifId,
            channelId: 'emperial_cabs_channel',
            smallIcon: 'ic_notification',
            iconColor: '#FFAE00',
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: extraData || null
          }
        ]
      });
      return;
    }
  } catch (e) {
    console.warn("Capacitor local notification schedule notice:", e);
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const targetTab = extraData?.tab || 'inquiries';
  const targetUrl = extraData?.url || `/admin?tab=${targetTab}`;

  const notifOptions = {
    body: body,
    icon: '/official-app-icon.png',
    badge: '/favicon.png',
    tag: tag || 'emperial_cabs_active_alert',
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      tab: targetTab,
      url: targetUrl,
      ...extraData
    }
  };

  const triggerShow = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, notifOptions);
      }).catch(() => {
        try {
          const n = new Notification(title, notifOptions);
          n.onclick = () => {
            window.focus();
            window.dispatchEvent(new CustomEvent('notificationclick_local', { detail: { tab: targetTab, url: targetUrl } }));
          };
        } catch (e) {}
      });
    } else {
      try {
        const n = new Notification(title, notifOptions);
        n.onclick = () => {
          window.focus();
          window.dispatchEvent(new CustomEvent('notificationclick_local', { detail: { tab: targetTab, url: targetUrl } }));
        };
      } catch (e) {}
    }
  };

  if (Notification.permission === 'granted') {
    triggerShow();
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        triggerShow();
      }
    }).catch(() => {});
  }
};

// Dispatch Admin Notification
export const notifyAdmin = ({ type = 'inquiry', title, body, extraData = {} }) => {
  const notifObj = {
    id: 'admin_notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type,
    title,
    desc: body,
    body,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toISOString(),
    read: false,
    ...extraData
  };

  try {
    const existing = JSON.parse(localStorage.getItem('cabsy_admin_notifications') || '[]');
    const updated = [notifObj, ...existing].slice(0, 50);
    localStorage.setItem('cabsy_admin_notifications', JSON.stringify(updated));
  } catch (e) {}

  const targetTab = extraData?.tab || (type === 'custom' || type === 'custom-trip' ? 'custom_inquiries' : 'inquiries');
  const targetUrl = `/admin?tab=${targetTab}`;

  // 1. Save to Remote MySQL so external admin devices/PWAs receive it via polling
  try {
    saveNotificationToMySQL({
      id: notifObj.id,
      target_phone: 'ADMIN',
      target_email: 'emperialcabsbhavnagar@gmail.com',
      title: title,
      body: body,
      type: type,
      extra_data: JSON.stringify({ tab: targetTab, ...extraData })
    }).catch(() => {});
  } catch (e) {}

  // 2. Broadcast across tabs/windows on the same device via BroadcastChannel
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('emperial_cabs_channel');
      bc.postMessage({
        type: 'ADMIN_NOTIFICATION',
        notification: notifObj,
        title,
        body,
        extraData: { tab: targetTab, ...extraData }
      });
    }
  } catch (e) {}

  // 3. Trigger local system push notification if permission is granted
  sendSystemPushNotification(title, body, 'admin-' + notifObj.id, { tab: targetTab, ...extraData });

  // 4. Dispatch server-side Web Push (Apple APNs / Google FCM) so iPhone / Android lock screens get alerted in background
  triggerRemoteServerPush({
    title,
    body,
    url: targetUrl,
    userType: 'admin',
    tag: 'admin-' + notifObj.id
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_admin_notif', { detail: notifObj }));
    window.dispatchEvent(new Event('storage'));
  }

  return notifObj;
};

// Dispatch Customer Notification
export const notifyCustomer = ({ type = 'inquiry', title, body, customerPhone, customerEmail, extraData = {} }) => {
  const notifObj = {
    id: 'cust_notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type,
    title,
    desc: body,
    body,
    customerPhone,
    customerEmail,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toISOString(),
    read: false,
    ...extraData
  };

  try {
    const existing = JSON.parse(localStorage.getItem('cabsy_customer_notifications') || '[]');
    const updated = [notifObj, ...existing].slice(0, 50);
    localStorage.setItem('cabsy_customer_notifications', JSON.stringify(updated));
    localStorage.setItem('cabsy_cloud_notif_delivered_' + notifObj.id, 'true');
    const sig = (title || '').trim().toLowerCase() + '|' + (body || '').trim().toLowerCase();
    const sigs = JSON.parse(localStorage.getItem('cabsy_delivered_signatures') || '[]');
    if (!sigs.includes(sig)) {
      sigs.push(sig);
      localStorage.setItem('cabsy_delivered_signatures', JSON.stringify(sigs.slice(-100)));
    }
  } catch (e) {}

  sendSystemPushNotification(title, body, 'cust-' + notifObj.id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_customer_notif', { detail: notifObj }));
    window.dispatchEvent(new Event('storage'));

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.postMessage({ type: 'CUSTOMER_NOTIFICATION', data: notifObj });
        bc.close();
      }
    } catch (e) {}
  }

  const isBookingInquiry = type === 'inquiry' || (title && title.toLowerCase().includes('booking request'));
  if (!isBookingInquiry) {
    try {
      saveNotificationToMySQL({
        id: notifObj.id,
        target_phone: customerPhone || '',
        target_email: customerEmail || '',
        title: title,
        body: body,
        type: type,
        extra_data: extraData
      }).catch(() => {});
    } catch (e) {}
  }

  return notifObj;
};

// Get Admin Notifications
export const getAdminNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem('cabsy_admin_notifications') || '[]');
  } catch (e) {
    return [];
  }
};

// Get Customer Notifications
export const getCustomerNotifications = (userPhone = null, userEmail = null) => {
  try {
    const all = JSON.parse(localStorage.getItem('cabsy_customer_notifications') || '[]');
    if (!userPhone && !userEmail) return all;
    return all.filter(n => 
      !n.customerPhone || 
      (userPhone && n.customerPhone === userPhone) ||
      (userEmail && n.customerEmail === userEmail)
    );
  } catch (e) {
    return [];
  }
};

// Automated Ecosystem Pre-Trip Scheduler (Scans for Today & 30-min Alerts)
export const runEcosystemSchedulerCheck = () => {
  try {
    const inquiriesData = localStorage.getItem('cabsy_inquiries');
    if (!inquiriesData) return;
    const inquiries = JSON.parse(inquiriesData);
    if (!Array.isArray(inquiries)) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    inquiries.forEach(inq => {
      if (inq.status === 'Cancelled' || inq.status === 'Completed') return;

      const flagTodayKey = `notif_sent_today_${inq.id}_${todayStr}`;
      const isTodayTrip = inq.date === 'Today' || (inq.date && inq.date.includes(todayStr));

      if (isTodayTrip && !localStorage.getItem(flagTodayKey)) {
        notifyAdmin({
          type: 'scheduled_today',
          title: `Upcoming Scheduled Trip Today`,
          body: `Customer ${inq.customerName}'s trip (${inq.pickup} to ${inq.dropoff}) is scheduled for today.`,
          extraData: { inquiryId: inq.id }
        });
        localStorage.setItem(flagTodayKey, '1');
      }

      const flag30mKey = `notif_sent_30m_${inq.id}`;
      if (inq.status === 'Confirmed' && !localStorage.getItem(flag30mKey)) {
        notifyAdmin({
          type: 'reminder_30m',
          title: `30-Minute Trip Alert`,
          body: `Customer ${inq.customerName}'s ride to ${inq.dropoff} is starting soon (within 30 mins).`,
          extraData: { inquiryId: inq.id }
        });
        localStorage.setItem(flag30mKey, '1');
      }
    });
  } catch (e) {
    console.warn('Ecosystem scheduler check error:', e);
  }
};

// Initialize background scheduler timer
let schedulerInterval = null;
export const initEcosystemScheduler = () => {
  runEcosystemSchedulerCheck();
  if (schedulerInterval) clearInterval(schedulerInterval);
  schedulerInterval = setInterval(runEcosystemSchedulerCheck, 60000);
};

export default {
  requestNotificationPermission,
  registerWebPushSubscription,
  triggerRemoteServerPush,
  sendSystemPushNotification,
  notifyAdmin,
  notifyCustomer,
  getAdminNotifications,
  getCustomerNotifications,
  runEcosystemSchedulerCheck,
  initEcosystemScheduler
};
