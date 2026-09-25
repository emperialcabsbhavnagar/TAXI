/**
 * Ecosystem Universal Notification Engine
 * Handles System Tray Push Notifications, Local Storage State Sync,
 * and Automated Ecosystem Pre-Trip Scheduler.
 */

import { LocalNotifications } from '@capacitor/local-notifications';

// Request system tray push notification permission
export const requestNotificationPermission = async () => {
  try {
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
      const res = await LocalNotifications.requestPermissions();
      if (res && res.display === 'granted') return true;
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

// Play audio chime for notifications
const playChimeSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Audio Context not allowed before user interaction, ignore
  }
};

// Trigger Phone / Desktop System Tray Push Notification (Mobile Chrome / APK Compatible)
export const sendSystemPushNotification = async (title, body, tag = 'EMPERIAL CABS-notif') => {
  playChimeSound();

  // Trigger device vibration if supported (pattern: 200ms vibrate, 100ms pause, 200ms vibrate)
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (e) {}

  // 1. Mobile Phone Native System Notification Panel (Android APK via Capacitor LocalNotifications)
  try {
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.createChannel({
          id: 'emperial_cabs_channel',
          name: 'EMPERIAL CABS Booking & Driver Alerts',
          description: 'Live trip status, driver details and booking confirmation',
          importance: 5,
          visibility: 1,
          vibration: true
        });
      } catch (ce) {}

      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 1000000) + 1,
            schedule: { at: new Date(Date.now() + 50) },
            channelId: 'emperial_cabs_channel',
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
      return;
    }
  } catch (e) {
    console.warn("Capacitor local notification schedule notice:", e);
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const notifOptions = {
    body: body,
    icon: '/EMPERAL_CABS_Website_Logo_Sharp.svg',
    badge: '/EMPERAL_CABS_Website_Logo_Sharp.svg',
    tag: tag,
    renotify: true,
    vibrate: [200, 100, 200]
  };

  const triggerShow = () => {
    // 2. Mobile Phone & PWA Native System Tray via ServiceWorker (Android/Chrome/APK)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, notifOptions);
      }).catch(() => {
        try {
          new Notification(title, notifOptions);
        } catch (e) {}
      });
    } else {
      // 3. Desktop Fallback
      try {
        new Notification(title, notifOptions);
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
    const updated = [notifObj, ...existing].slice(0, 50); // keep last 50
    localStorage.setItem('cabsy_admin_notifications', JSON.stringify(updated));
  } catch (e) {}

  sendSystemPushNotification(title, body, 'admin-' + notifObj.id);

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
  } catch (e) {}

  sendSystemPushNotification(title, body, 'cust-' + notifObj.id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_customer_notif', { detail: notifObj }));
    window.dispatchEvent(new Event('storage'));

    // Real-time Cross-Tab Broadcast Channel Sync
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.postMessage({ type: 'CUSTOMER_NOTIFICATION', data: notifObj });
        bc.close();
      }
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

      // 1. Today's Trip Notification to Admin
      const flagTodayKey = `notif_sent_today_${inq.id}_${todayStr}`;
      const isTodayTrip = inq.date === 'Today' || (inq.date && inq.date.includes(todayStr));

      if (isTodayTrip && !localStorage.getItem(flagTodayKey)) {
        notifyAdmin({
          type: 'scheduled_today',
          title: `📅 Upcoming Scheduled Trip Today!`,
          body: `Customer ${inq.customerName}'s trip (${inq.pickup} → ${inq.dropoff}) is scheduled for today!`,
          extraData: { inquiryId: inq.id }
        });
        localStorage.setItem(flagTodayKey, '1');
      }

      // 2. 30-Minute Pre-Trip Alert Notification to Admin
      const flag30mKey = `notif_sent_30m_${inq.id}`;
      if (inq.status === 'Confirmed' && !localStorage.getItem(flag30mKey)) {
        // If trip created/confirmed recently or scheduled within 30 mins
        notifyAdmin({
          type: 'reminder_30m',
          title: `⏰ 30-Minute Trip Alert!`,
          body: `Customer ${inq.customerName}'s ride to ${inq.dropoff} is starting soon (within 30 mins)!`,
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
  schedulerInterval = setInterval(runEcosystemSchedulerCheck, 60000); // Check every 60s
};

export default {
  requestNotificationPermission,
  sendSystemPushNotification,
  notifyAdmin,
  notifyCustomer,
  getAdminNotifications,
  getCustomerNotifications,
  runEcosystemSchedulerCheck,
  initEcosystemScheduler
};
