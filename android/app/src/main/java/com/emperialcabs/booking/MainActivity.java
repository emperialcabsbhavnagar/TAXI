package com.emperialcabs.booking;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {

    @CapacitorPlugin(name = "NativeTripSync")
    public static class NativeTripSyncPlugin extends Plugin {
        @PluginMethod
        public void syncCustomerTrip(PluginCall call) {
            String inquiryId = call.getString("inquiryId", "");
            String phone = call.getString("phone", "");
            String email = call.getString("email", "");
            Context ctx = getContext();
            if (ctx != null) {
                SharedPreferences prefs = ctx.getSharedPreferences(TripNotificationReceiver.PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                if (phone != null && !phone.isEmpty()) {
                    editor.putString("customer_phone", phone);
                }
                if (email != null && !email.isEmpty()) {
                    editor.putString("customer_email", email);
                }
                if (inquiryId != null && !inquiryId.isEmpty()) {
                    editor.putString("pending_inquiry_id", inquiryId);
                }
                editor.apply();

                // Trigger background check and schedule repeating alarm
                TripNotificationReceiver.scheduleNextCheck(ctx, 3);
            }
            call.resolve();
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GoogleAuth.class);
        registerPlugin(NativeTripSyncPlugin.class);
    }
}
