package com.vazhi;

/**
 * DriveLegalPackage - React Native Package registration
 * 
 * This class registers our custom NativeModules
 * with React Native so they can be accessed from JavaScript.
 * 
 * Think of this as a plugin that adds extra capabilities to React Native.
 */
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class DriveLegalPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        // Register our Python bridge module, Location Service module, TTS module, and Native SpeechRecognizer module
        return Arrays.<NativeModule>asList(
            new DriveLegalLocationServiceModule(reactContext),
            new DriveLegalTTSModule(reactContext),
            new DriveLegalSpeechRecognizerModule(reactContext)
        );
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        // No custom UI components in this package
        return Collections.emptyList();
    }
}

