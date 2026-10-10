import mysql from 'mysql2/promise';
import webpush from 'web-push';

const poolConfig = {
  host: process.env.MYSQL_HOST || 'srv2213.hstgr.io',
  user: process.env.MYSQL_USER || 'u217835086_TAXI',
  password: process.env.MYSQL_PASSWORD || 'Mahadev@0963',
  database: process.env.MYSQL_DATABASE || 'u217835086_TAXI',
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 2,
  maxIdle: 1,
  idleTimeout: 5000,
  queueLimit: 10,
  connectTimeout: 8000
};

if (!global._pushMysqlPool) {
  global._pushMysqlPool = mysql.createPool(poolConfig);
}
const pool = global._pushMysqlPool;

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNjJ7GWaU-7KXkdkyyxoTyNGCRFSztK8KNtPQW9BWDycOZyVpSJZB7PZJ74JfL0ZSS9DZtrgHPe-cE9U9qi23CY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'yt0dGxUuTDPcsFg9ekfwuBBI8Ab7-Tt4Biy9TRtsE74';
const VAPID_SUBJECT = 'mailto:emperialcabsbhavnagar@gmail.com';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const title = body.title || 'EMPERIAL CABS Dispatch Alert';
    const message = body.body || body.message || 'New ride inquiry received.';
    const url = body.url || '/admin?tab=inquiries';
    const tag = body.tag || ('disp-' + Date.now());
    const userType = body.userType || body.user_type || 'admin';

    // 1. Fetch active push subscriptions from MySQL
    const [rows] = await pool.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_type = ? ORDER BY id DESC LIMIT 50',
      [userType]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        sentCount: 0,
        totalSubs: 0,
        message: 'No push subscriptions currently registered for ' + userType
      });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url,
      tag
    });

    let sentCount = 0;
    const expiredIds = [];

    // 2. Dispatch push to all registered devices concurrently
    await Promise.all(
      rows.map(async (sub) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }, payload, {
            urgency: 'high',
            TTL: 86400,
            headers: (sub.endpoint && sub.endpoint.includes('push.apple.com')) ? {
              'apns-push-type': 'alert',
              'apns-priority': '10'
            } : {}
          });
          sentCount++;
        } catch (pushErr) {
          console.warn('[WebPush] Error dispatching to', sub.endpoint.slice(0, 40), pushErr.statusCode);
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            expiredIds.push(sub.id);
          }
        }
      })
    );

    // 3. Clean up expired subscriptions
    if (expiredIds.length > 0) {
      try {
        const placeholders = expiredIds.map(() => '?').join(',');
        await pool.query(`DELETE FROM push_subscriptions WHERE id IN (${placeholders})`, expiredIds);
      } catch (cleanupErr) {}
    }

    return res.status(200).json({
      success: true,
      sentCount,
      totalSubs: rows.length,
      expiredCount: expiredIds.length
    });
  } catch (error) {
    console.error('[WebPush] Dispatch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  }
}
