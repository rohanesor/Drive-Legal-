package com.vazhi;
import expo.modules.ReactActivityDelegateWrapper;

/**
 * MainActivity - Entry point activity for the React Native app
 * 
 * This is the first screen users see. It loads the React Native JavaScript bundle
 * and renders the App component defined in frontend/src/App.tsx
 */
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class MainActivity extends ReactActivity {

    @Override
    protected String getMainComponentName() {
        // Must match AppRegistry.registerComponent name in index.js
        return "DriveLegal";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            DefaultNewArchitectureEntryPoint.getFabricEnabled()));
    }
}

