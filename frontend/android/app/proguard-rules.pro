# Proguard rules for DriveLegal
# Add project specific Proguard rules here.

# Keep Chaquopy classes intact
-keep class com.chaquo.python.** { *; }
-keep class javax.python.** { *; }

# Keep React Native NativeModules and standard classes
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }

# Suppress warnings
-dontwarn com.chaquo.python.**
-dontwarn javax.python.**
