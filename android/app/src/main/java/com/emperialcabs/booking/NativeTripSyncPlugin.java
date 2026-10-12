package com.emperialcabs.booking;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeTripSync")
public class NativeTripSyncPlugin extends Plugin {
    private static final String TAG = "NativeTripSync";

    @PluginMethod
    public void syncCustomerTrip(PluginCall call) {
        String inquiryId = call.getString("inquiryId", "");
        String phone = call.getString("phone", "");
        String email = call.getString("email", "");

        Log.d(TAG, "syncCustomerTrip called: phone=" + phone + " email=" + email + " inq=" + inquiryId);

        Context ctx = getContext();
        if (ctx != null) {
            SharedPreferences prefs = ctx.getSharedPreferences(TripNotificationReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            if (phone != null && !phone.trim().isEmpty()) {
                editor.putString("customer_phone", phone.trim());
            }
            if (email != null && !email.trim().isEmpty()) {
                editor.putString("customer_email", email.trim().toLowerCase());
            }
            if (inquiryId != null && !inquiryId.trim().isEmpty()) {
                editor.putString("pending_inquiry_id", inquiryId.trim());
            }
            editor.apply();

            // Trigger background check and schedule repeating alarm immediately
            TripNotificationReceiver.scheduleNextCheck(ctx, 1);
        }
        call.resolve();
    }

    @PluginMethod
    public void setStatusBarTheme(PluginCall call) {
        String theme = call.getString("theme", "light");
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                Window window = getActivity().getWindow();
                WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(window, window.getDecorView());
                if (insets != null) {
                    insets.setAppearanceLightStatusBars("light".equalsIgnoreCase(theme));
                }
            });
        }
        call.resolve();
    }
}
