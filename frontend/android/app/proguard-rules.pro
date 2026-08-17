# Proguard rules for DriveLegal

# ── React Native Core ────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ── React Native Bridge / NativeModules ─────────────────────────────────────
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.BaseJavaModule { *; }
-keepclassmembers class * implements com.facebook.react.bridge.NativeModule { *; }
-keep public class * extends com.facebook.react.ReactPackage

# ── DriveLegal Native Modules ────────────────────────────────────────────────
-keep class com.drivelegal.DriveLegalLocationService { *; }
-keep class com.drivelegal.DriveLegalLocationServiceModule { *; }
-keep class com.drivelegal.DriveLegalPackage { *; }
-keep class com.drivelegal.MainApplication { *; }
-keep class com.drivelegal.MainActivity { *; }

# ── React Native Push Notification ──────────────────────────────────────────
-keep class com.dieam.reactnativepushnotification.** { *; }
-dontwarn com.dieam.reactnativepushnotification.**

# ── Expo modules ─────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# ── OkHttp / Networking ──────────────────────────────────────────────────────
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ── Sentry ───────────────────────────────────────────────────────────────────
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ── Google Play Services Location ────────────────────────────────────────────
-keep class com.google.android.gms.location.** { *; }
-dontwarn com.google.android.gms.**

# ── React Native Audio Recorder Player ───────────────────────────────────────
-keep class com.ReactNativeAudioRecorderPlayer.** { *; }
-dontwarn com.ReactNativeAudioRecorderPlayer.**

# ── React Native Maps ─────────────────────────────────────────────────────────
-keep class com.airbnb.android.react.maps.** { *; }
-dontwarn com.airbnb.android.react.maps.**

# ── React Navigation / Gesture Handler ───────────────────────────────────────
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.**
-keep class com.th3rdwave.safeareacontext.** { *; }

# ── Suppress known safe warnings ─────────────────────────────────────────────
-dontwarn android.app.ApplicationStartInfo
-dontwarn javax.annotation.**
-dontwarn sun.misc.Unsafe

# ── R8 / KotlinPoet annotation processor (compile-time only, not in runtime) ─
-dontwarn javax.lang.model.element.Element
-dontwarn javax.lang.model.type.TypeMirror
-dontwarn javax.lang.model.type.TypeVisitor
-dontwarn javax.lang.model.util.SimpleTypeVisitor7
-dontwarn com.squareup.kotlinpoet.**
