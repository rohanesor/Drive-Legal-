/**
 * Python Bridge Service - TypeScript wrapper for the NativeModule bridge
 * 
 * THIS IS THE KEY CONNECTION between React Native and the Python backend.
 * 
 * How it works:
 * 1. React Native calls these functions (executeQuery, checkZones, etc.)
 * 2. The functions serialize data to JSON strings
 * 3. JSON is sent to Java NativeModule (PythonBridgeModule.java)
 * 4. Java passes it to Chaquopy Python interpreter
 * 5. Python processes the query and returns a JSON response
 * 6. Java returns the JSON string back to TypeScript
 * 7. TypeScript parses it and returns the result
 * 
 * All Python communication happens through this single file.
 */
import { NativeModules } from 'react-native';

// Get reference to our custom NativeModule
const { PythonBridge } = NativeModules;

/**
 * QueryPayload - Data sent from RN to Python for processing
 */
export interface QueryPayload {
  action: string;          // 'query'
  text?: string;           // User's text input
  audio_uri?: string;      // Path to recorded audio file (for voice input)
  location?: {             // GPS location for state-specific laws
    lat: number;
    lng: number;
    state: string;         // State code (TN, KN, etc.)
  };
  language: string;        // 'en', 'ta', or 'hi'
}

/**
 * ZoneCheckPayload - Data sent to check for zone alerts
 */
export interface ZoneCheckPayload {
  action: string;
  location: {
    lat: number;
    lng: number;
    state: string;
  };
}

/**
 * QueryResult - Data returned from Python after processing
 */
export interface QueryResult {
  status: string;                // 'success' or 'error'
  response_text?: string;        // Bot's response text
  response_audio_uri?: string;   // Path to TTS audio file
  source_sections?: string[];    // Law citations (e.g., "MV Act §188")
  confidence?: number;           // 0.0 to 1.0 search confidence
  code?: string;                 // Error code (if status === 'error')
  message?: string;              // Error message
  fallback_available?: boolean;  // Whether a template fallback is available
  fallback_response_text?: string; // Fallback response text
}

/**
 * ZoneAlertResult - Data returned from zone checking
 */
export interface ZoneAlertResult {
  status: string;
  zone_type?: string;
  zone_name?: string;
  message?: string;
  suggested_query?: string;
  severity?: string;
}

/**
 * executeQuery - Send a user query to the Python backend
 * 
 * Flow: User types/speaks -> RN -> Python -> FAISS search -> LLM/template -> RN
 */
export const executeQuery = async (payload: QueryPayload): Promise<QueryResult> => {
  try {
    // Send JSON to Java NativeModule, get JSON string back
    const result = await PythonBridge.executeQuery(JSON.stringify(payload));
    return JSON.parse(result) as QueryResult;
  } catch (error) {
    console.error('PythonBridge.executeQuery error:', error);
    return {
      status: 'error',
      code: 'BRIDGE_ERROR',
      message: 'Failed to communicate with Python service',
      fallback_available: false,
    };
  }
};

/**
 * checkZones - Check if current GPS location triggers any zone alerts
 * 
 * Called periodically by the background GPS service
 */
export const checkZones = async (payload: ZoneCheckPayload): Promise<ZoneAlertResult> => {
  try {
    const result = await PythonBridge.checkZones(JSON.stringify(payload));
    return JSON.parse(result) as ZoneAlertResult;
  } catch (error) {
    console.error('PythonBridge.checkZones error:', error);
    return { status: 'error' };
  }
};

/**
 * initializePython - Preload Python models on app startup
 * 
 * Reduces first-query latency by loading models in background
 */
export const initializePython = async (): Promise<string> => {
  try {
    const result = await PythonBridge.initializePython();
    return result;
  } catch (error) {
    console.error('PythonBridge.initializePython error:', error);
    throw error;
  }
};
