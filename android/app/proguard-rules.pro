# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Capacitor WebView App - Keep rules for R8 optimization

# Keep Capacitor core classes
-keep class com.getcapacitor.** { *; }
-keep class com.emperialcabs.booking.** { *; }

# Keep JavaScript interface classes for WebView bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor plugin annotations and methods
-keepattributes *Annotation*
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public *;
}

# Keep Google Auth plugin and Play Services Auth classes
-keep class com.codetrixstudio.capacitor.GoogleAuth.** { *; }
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.android.gms.common.api.** { *; }
-keep class com.google.android.gms.common.internal.safeparcel.** { *; }

# Keep AndroidX classes used by Capacitor
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Keep notification-related classes
-keep class android.app.NotificationChannel { *; }
-keep class android.app.NotificationManager { *; }

# Preserve line number information for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Don't warn about missing optional dependencies
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
-dontwarn com.google.android.gms.**
