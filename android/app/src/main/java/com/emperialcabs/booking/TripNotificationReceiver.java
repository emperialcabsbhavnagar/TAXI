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
 */
public class TripNotificationReceiver extends BroadcastReceiver {

    public static final String ACTION_CHECK_TRIP = "com.emperialcabs.booking.CHECK_TRIP_NOTIFICATION";
    public static final String CHANNEL_ID = "trip_updates_channel";
    public static final String PREFS_NAME = "cabsy_customer_sync";

    @Override
    public void onReceive(Context context, Intent intent) {
        Executors.newSingleThreadExecutor().execute(() -> {
            checkAndDispatch(context);
        });
    }

    private void checkAndDispatch(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String phone = prefs.getString("customer_phone", "");
        String activeInquiryId = prefs.getString("pending_inquiry_id", "");

        if (phone.isEmpty() && activeInquiryId.isEmpty()) {
            return;
        }

        try {
            String queryUrl = "https://emperialcabs.com/api/db.php?action=getCustomerNotifications";
            if (!phone.isEmpty()) {
                queryUrl += "&phone=" + URLEncoder.encode(phone, "UTF-8");
            }

            URL url = new URL(queryUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);

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

                    for (int i = 0; i < list.length(); i++) {
                        JSONObject notif = list.getJSONObject(i);
                        String notifId = notif.optString("id", "");
                        String title = notif.optString("title", "EMPERIAL CABS Update");
                        String body = notif.optString("body", "");
                        String type = notif.optString("type", "");

                        if (prefs.getBoolean("delivered_" + notifId, false)) {
                            continue;
                        }

                        // Display native notification
                        showSystemNotification(context, title, body, notifId);

                        // Mark in local prefs and on server
                        prefs.edit().putBoolean("delivered_" + notifId, true).apply();
                        markDeliveredOnServer(notifId);

                        if ("confirmed".equalsIgnoreCase(type) || "rejected".equalsIgnoreCase(type) || "cancelled".equalsIgnoreCase(type)) {
                            anyTerminalFound = true;
                        }
                    }

                    if (anyTerminalFound) {
                        // Trip terminal status reached -> Clean pending inquiry state
                        prefs.edit().remove("pending_inquiry_id").apply();
                        return; // Stop repeating checks
                    }
                }
            }
            conn.disconnect();
        } catch (Exception ignored) {}

        // Schedule next check in 25 seconds if inquiry is still pending
        String currentInq = prefs.getString("pending_inquiry_id", "");
        if (!currentInq.isEmpty()) {
            scheduleNextCheck(context, 25);
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
        PendingIntent pendingIntent = PendingIntent.getActivity(context, uniqueInt, intent, flags);

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent);

        try {
            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            manager.notify(uniqueInt, builder.build());
        } catch (SecurityException ignored) {}
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
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);

            JSONObject payload = new JSONObject();
            payload.put("id", notifId);
            byte[] out = payload.toString().getBytes(StandardCharsets.UTF_8);

            OutputStream os = conn.getOutputStream();
            os.write(out);
            os.flush();
            os.close();

            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception ignored) {}
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

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (Exception ignored) {}
    }
}
