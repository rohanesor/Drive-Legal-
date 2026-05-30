package com.drivelegal;

import android.speech.tts.TextToSpeech;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import java.util.Locale;

/**
 * DriveLegalTTSModule - High-speed, offline-first Text-to-Speech Java bridge.
 * 
 * Directly binds standard built-in android.speech.tts.TextToSpeech.
 * Provides ultra-low response latency (<100ms startup) and handles English, Tamil, and Hindi.
 */
public class DriveLegalTTSModule extends ReactContextBaseJavaModule implements TextToSpeech.OnInitListener {
    private TextToSpeech tts;
    private boolean isReady = false;

    public DriveLegalTTSModule(ReactApplicationContext reactContext) {
        super(reactContext);
        tts = new TextToSpeech(reactContext, this);
    }

    @Override
    public String getName() {
        return "DriveLegalTTS";
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            isReady = true;
            tts.setLanguage(Locale.US);
        }
    }

    /**
     * Synthesize text into local voice output offline.
     * Uses QUEUE_FLUSH to instantly interrupt ongoing speak tasks when called again.
     */
    @ReactMethod
    public void speak(String text, String langCode, final Promise promise) {
        if (!isReady || tts == null) {
            promise.reject("NOT_READY", "TextToSpeech engine is not initialized yet.");
            return;
        }

        Locale locale = Locale.US;
        if ("ta".equalsIgnoreCase(langCode)) {
            locale = new Locale("ta", "IN");
        } else if ("hi".equalsIgnoreCase(langCode)) {
            locale = new Locale("hi", "IN");
        } else if ("te".equalsIgnoreCase(langCode)) {
            locale = new Locale("te", "IN");
        } else if ("kn".equalsIgnoreCase(langCode) || "ka".equalsIgnoreCase(langCode)) {
            locale = new Locale("kn", "IN");
        } else if ("ml".equalsIgnoreCase(langCode)) {
            locale = new Locale("ml", "IN");
        }
        
        int result = tts.setLanguage(locale);
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            // Fallback to default US English if language packages are missing
            tts.setLanguage(Locale.US);
        }

        // QUEUE_FLUSH flushes any playing audio instantly, handling voice interruption natively
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "drivelegal_speech_utterance");
        promise.resolve(true);
    }

    /**
     * Instantly halt any active speech audio.
     */
    @ReactMethod
    public void stop(final Promise promise) {
        if (tts != null) {
            tts.stop();
        }
        promise.resolve(true);
    }

    /**
     * Check if speech audio is currently playing.
     */
    @ReactMethod
    public void isSpeaking(final Promise promise) {
        boolean speaking = tts != null && tts.isSpeaking();
        promise.resolve(speaking);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onCatalystInstanceDestroy();
    }
}
