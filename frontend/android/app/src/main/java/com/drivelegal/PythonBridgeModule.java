package com.drivelegal;

/**
 * PythonBridgeModule - React Native Native Module for Python communication
 * 
 * This class serves as the bridge between React Native (JavaScript/TypeScript)
 * and the embedded Python service. It exposes three methods to JavaScript:
 * 
 * 1. executeQuery() - Sends a user query to Python, gets back a legal response
 * 2. checkZones() - Checks if current GPS location triggers any zone alerts
 * 3. initializePython() - Preloads models and initializes the Python service
 * 
 * Communication flow:
 * React Native -> NativeModule -> Chaquopy Python -> Python function -> JSON string -> React Native
 * 
 * All communication uses JSON strings to avoid complex type conversions
 * between JavaScript and Python.
 */
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
        // This name is used in JavaScript: NativeModules.PythonBridge
        return MODULE_NAME;
    }

    /**
     * Executes a user query through the Python service
     * 
     * @param jsonPayload JSON string containing: action, text/audio_uri, location, language
     * @param promise Resolves with JSON string: status, response_text, source_sections, confidence
     */
    @ReactMethod
    public void executeQuery(String jsonPayload, Promise promise) {
        try {
            // Get the Python interpreter instance
            Python py = Python.getInstance();
            // Load the 'main' Python module (backend/src/main.py)
            PyObject module = py.getModule("main");
            // Call the handle_query function with our JSON payload
            PyObject result = module.callAttr("handle_query", jsonPayload);
            String response = result.toString();
            Log.d(TAG, "Query executed successfully");
            promise.resolve(response);
        } catch (Exception e) {
            Log.e(TAG, "Error executing query", e);
            promise.reject("PYTHON_ERROR", e.getMessage());
        }
    }

    /**
     * Checks if the given GPS coordinates trigger any zone alerts
     * 
     * @param jsonPayload JSON string containing: action, location (lat, lng, state)
     * @param promise Resolves with JSON string: zone alert info or 'no_alert'
     */
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

    /**
     * Initializes the Python service and preloads models
     * Called on app startup to reduce first-query latency
     */
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
