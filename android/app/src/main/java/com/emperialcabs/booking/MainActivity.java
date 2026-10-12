package com.emperialcabs.booking;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate so BridgeActivity includes them when initializing the bridge
        registerPlugin(GoogleAuth.class);
        registerPlugin(NativeTripSyncPlugin.class);

        super.onCreate(savedInstanceState);

        // Prompt for POST_NOTIFICATIONS runtime permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
            }
        }

        // ── Enable edge-to-edge layout so WebView draws behind transparent status bar ──
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Transparent status bar with dark icons (light status bar)
        window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
        window.setNavigationBarColor(0xFFFFFFFF);
        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(true);
            insetsController.setAppearanceLightNavigationBars(true);
        }

        // Clear any FLAG_TRANSLUCENT flags
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

        // Reset any padding on content view so the app fills the entire screen to the very top,
        // and send the exact status bar height to the WebView CSS variable --android-status-bar-height
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setPadding(0, 0, 0, 0);
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, insets) -> {
                androidx.core.graphics.Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                int statusBarHeightPx = systemBars.top;
                float density = getResources().getDisplayMetrics().density;
                int statusBarDp = Math.round(statusBarHeightPx / density);
                if (statusBarDp > 0 && getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() -> {
                        getBridge().getWebView().evaluateJavascript(
                            "document.documentElement.style.setProperty('--android-status-bar-height', '" + statusBarDp + "px');",
                            null
                        );
                    });
                }
                v.setPadding(0, 0, 0, 0);
                return insets;
            });
        }

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }
        if (getActionBar() != null) {
            getActionBar().hide();
        }

        // Immediately start background notification receiver loop
        TripNotificationReceiver.scheduleNextCheck(this, 3);
    }
}
