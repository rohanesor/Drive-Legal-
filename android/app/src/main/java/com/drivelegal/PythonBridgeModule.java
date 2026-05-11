package com.drivelegal;

import android.util.Log;

import com.chaquo.python.Python;
import com.chaquo.python.PyObject;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class PythonBridgeModule extends ReactContextBaseJavaModule {

    private static final String TAG = "PythonBridge";
    private static final String MODULE_NAME = "PythonBridge";

    public PythonBridgeModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void executeQuery(String jsonPayload, Promise promise) {
        try {
            Python py = Python.getInstance();
            PyObject module = py.getModule("main");
            PyObject result = module.callAttr("handle_query", jsonPayload);
            String response = result.toString();
            Log.d(TAG, "Query executed successfully");
            promise.resolve(response);
        } catch (Exception e) {
            Log.e(TAG, "Error executing query", e);
            promise.reject("PYTHON_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void checkZones(String jsonPayload, Promise promise) {
        try {
            Python py = Python.getInstance();
            PyObject module = py.getModule("main");
            PyObject result = module.callAttr("handle_zone_check", jsonPayload);
            String response = result.toString();
            Log.d(TAG, "Zone check executed successfully");
            promise.resolve(response);
        } catch (Exception e) {
            Log.e(TAG, "Error checking zones", e);
            promise.reject("PYTHON_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void initializePython(Promise promise) {
        try {
            Python py = Python.getInstance();
            PyObject module = py.getModule("main");
            PyObject result = module.callAttr("initialize");
            String response = result.toString();
            Log.d(TAG, "Python initialized: " + response);
            promise.resolve(response);
        } catch (Exception e) {
            Log.e(TAG, "Error initializing Python", e);
            promise.reject("PYTHON_INIT_ERROR", e.getMessage());
        }
    }
}
