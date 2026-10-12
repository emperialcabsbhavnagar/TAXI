package com.emperialcabs.booking;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

/**
 * TripNotificationReceiver
 * Native Android background notification receiver that checks for unread customer trip
 * updates (e.g. driver assigned, confirmation, cancellation) directly from Hostinger MySQL,
 * delivering Android system tray alerts even when the app is completely closed.
 *
 * Also handles BOOT_COMPLETED and MY_PACKAGE_REPLACED to restart the polling loop
 * after device reboot or app update.
 */
public class TripNotificationReceiver extends BroadcastReceiver {

    private static final String TAG = "TripNotifReceiver";
    public static final String ACTION_CHECK_TRIP = "com.emperialcabs.booking.CHECK_TRIP_NOTIFICATION";
    public static final String CHANNEL_ID = "trip_updates_channel";
    public static final String PREFS_NAME = "cabsy_customer_sync";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "onReceive action=" + action);

        // On boot or package replaced, just restart the polling loop
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Log.d(TAG, "Boot/PackageReplaced → restarting notification polling loop");
            scheduleNextCheck(context, 5);
            return;
        }

        android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
        android.os.PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            try {
                wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "cabsy:trip_sync_wakelock");
                wakeLock.acquire(25000L);
            } catch (Exception ignored) {}
        }
        final android.os.PowerManager.WakeLock finalWakeLock = wakeLock;

        final PendingResult pendingResult = goAsync();
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                checkAndDispatch(context);
            } catch (Exception e) {
                Log.e(TAG, "checkAndDispatch error", e);
            } finally {
                if (finalWakeLock != null && finalWakeLock.isHeld()) {
                    try { finalWakeLock.release(); } catch (Exception ignored) {}
                }
                pendingResult.finish();
            }
        });
    }

    private void checkAndDispatch(Context context) {

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String phone = prefs.getString("customer_phone", "");
        String email = prefs.getString("customer_email", "");

        try {
            String queryUrl = "https://emperialcabs.com/api/db.php?action=getCustomerNotifications";
            if (!phone.isEmpty()) {
                queryUrl += "&phone=" + URLEncoder.encode(phone, "UTF-8");
            }
            if (!email.isEmpty()) {
                queryUrl += "&email=" + URLEncoder.encode(email, "UTF-8");
            }

            Log.d(TAG, "Polling: " + queryUrl);

            URL url = new URL(queryUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EmperialCabsApp/1.1");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            int status = conn.getResponseCode();
            if (status == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();

                JSONObject res = new JSONObject(sb.toString());
                if (res.optBoolean("success", false) && res.has("notifications")) {
                    JSONArray list = res.getJSONArray("notifications");
                    boolean anyTerminalFound = false;

                    Log.d(TAG, "Got " + list.length() + " notifications from server");

                    for (int i = 0; i < list.length(); i++) {
                        JSONObject notif = list.getJSONObject(i);
                        String notifId = notif.optString("id", "");
                        String title = notif.optString("title", "EMPERIAL CABS Update");
                        String body = notif.optString("body", "");
                        String type = notif.optString("type", "");
                        String targetPhone = notif.optString("target_phone", "");
                        String targetEmail = notif.optString("target_email", "");
                        String createdAtStr = notif.optString("created_at", "");
                        boolean isBroadcast = "ALL".equalsIgnoreCase(targetPhone) || "all".equalsIgnoreCase(targetEmail);

                        // If already delivered to this device, skip
                        if (prefs.getBoolean("delivered_" + notifId, false)) {
                            continue;
                        }

                        // Signature deduplication: avoid repeating same text notification
                        String sig = (title + "|" + body).trim().toLowerCase();
                        String sigKey = "delivered_sig_" + Math.abs(sig.hashCode());
                        if (prefs.getBoolean(sigKey, false)) {
                            prefs.edit().putBoolean("delivered_" + notifId, true).apply();
                            continue;
                        }

                        // For BROADCAST advertisement notifications:
                        // Only alert if created in the last 15 minutes! Older broadcasts are historical.
                        if (isBroadcast) {
                            long nowMs = System.currentTimeMillis();
                            long createdMs = 0;
                            try {
                                if (createdAtStr != null && !createdAtStr.isEmpty()) {
                                    java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US);
                                    sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                                    java.util.Date d = sdf.parse(createdAtStr);
                                    if (d != null) createdMs = d.getTime();
                                }
                            } catch (Exception ignored) {}

                            // If broadcast is older than 15 minutes, silently mark as delivered without alerting!
                            if (createdMs > 0 && (nowMs - createdMs > 15 * 60 * 1000L)) {
                                Log.d(TAG, "Silently skipping historical broadcast (>15m): " + title);
                                prefs.edit().putBoolean("delivered_" + notifId, true).putBoolean(sigKey, true).apply();
                                continue;
                            }
                        }

                        Log.d(TAG, "Showing notification: " + title + " | " + body);

                        // Display native system tray notification
                        showSystemNotification(context, title, body, notifId);

                        // Mark in local prefs so this device never re-alerts
                        prefs.edit().putBoolean("delivered_" + notifId, true).putBoolean(sigKey, true).apply();

                        // Only mark delivered on MySQL if NOT a universal broadcast!
                        if (!isBroadcast) {
                            markDeliveredOnServer(notifId);
                        }

                        if ("confirmed".equalsIgnoreCase(type) || "rejected".equalsIgnoreCase(type) || "cancelled".equalsIgnoreCase(type)) {
                            anyTerminalFound = true;
                        }
                    }

                    if (anyTerminalFound) {
                        // Trip terminal status reached -> Clean pending inquiry state
                        prefs.edit().remove("pending_inquiry_id").apply();
                    }
                }
            } else {
                Log.w(TAG, "Server returned status " + status);
            }
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Network/poll error", e);
        } finally {
            // Schedule next check in background: 15s if active trip pending, 35s for background alerts/broadcasts
            boolean hasPendingInq = !prefs.getString("pending_inquiry_id", "").isEmpty();
            int nextDelay = hasPendingInq ? 15 : 35;
            scheduleNextCheck(context, nextDelay);
        }
    }

    private void showSystemNotification(Context context, String title, String body, String notifId) {
        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("navigate_tab", "rides");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        int uniqueInt = Math.abs(notifId.hashCode());
        if (uniqueInt <= 0) {
            uniqueInt = (int) (System.currentTimeMillis() % 100000) + 1;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(context, uniqueInt, intent, flags);

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent);

        try {
            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            manager.notify(uniqueInt, builder.build());
            Log.d(TAG, "System notification displayed: id=" + uniqueInt);
        } catch (SecurityException e) {
            Log.e(TAG, "Notification permission denied", e);
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Trip Updates & Confirmations",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for booking confirmation, assigned driver, vehicle details, and receipts");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 100, 250});
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                    .build();
            channel.setSound(defaultSoundUri, audioAttributes);

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void markDeliveredOnServer(String notifId) {
        if (notifId == null || notifId.isEmpty()) return;
        try {
            URL url = new URL("https://emperialcabs.com/api/db.php?action=markNotificationDelivered");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EmperialCabsApp/1.1");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            JSONObject payload = new JSONObject();
            payload.put("id", notifId);
            byte[] out = payload.toString().getBytes(StandardCharsets.UTF_8);

            OutputStream os = conn.getOutputStream();
            os.write(out);
            os.flush();
            os.close();

            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception e) {
            Log.w(TAG, "markDelivered error for id=" + notifId, e);
        }
    }

    public static void scheduleNextCheck(Context context, int delaySeconds) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, TripNotificationReceiver.class);
            intent.setAction(ACTION_CHECK_TRIP);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(context, 8881, intent, flags);
            long triggerAt = System.currentTimeMillis() + (delaySeconds * 1000L);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ (API 31+): Check if exact alarm permission is granted
                if (am.canScheduleExactAlarms()) {
                    try {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                        Log.d(TAG, "Scheduled exact alarm in " + delaySeconds + "s");
                    } catch (SecurityException se) {
                        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                        Log.d(TAG, "Fallback to inexact alarm (SecurityException) in " + delaySeconds + "s");
                    }
                } else {
                    // Exact alarm not permitted — use inexact alarm that still wakes device
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    Log.d(TAG, "Scheduled inexact alarm (no exact perm) in " + delaySeconds + "s");
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } catch (SecurityException se) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (Exception e) {
            Log.e(TAG, "scheduleNextCheck error", e);
        }
    }
}
