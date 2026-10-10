/**
 * Ecosystem Universal Notification Engine
 * Handles System Tray Push Notifications, Local Storage State Sync,
 * and Automated Ecosystem Pre-Trip Scheduler.
 */

// Request system tray push notification permission
export const requestNotificationPermission = async () => {
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

// Trigger Phone / Desktop System Tray Push Notification
export const sendSystemPushNotification = (title, body, tag = 'taxigo-notif') => {
  playChimeSound();
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: '/assets/images/splash-screen/logo.png',
        badge: '/assets/images/splash-screen/logo.png',
        tag: tag,
        renotify: true
      });
    } catch (e) {
      console.warn('System push notification error:', e);
    }
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
    window.dispatchEvent(new CustomEvent('taxigo_admin_notif', { detail: notifObj }));
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
    window.dispatchEvent(new CustomEvent('taxigo_customer_notif', { detail: notifObj }));
    window.dispatchEvent(new Event('storage'));
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

// Automated Ecosystem Pre-Trip Scheduler - Disabled per user instruction
export const runEcosystemSchedulerCheck = () => {
  // Disabled: no automated upcoming trip popup alerts on app open
};

// Initialize background scheduler timer - Disabled per user instruction
export const initEcosystemScheduler = () => {
  // Disabled: no automated upcoming trip popup alerts on app open
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
