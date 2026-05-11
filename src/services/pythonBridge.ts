import { NativeModules } from 'react-native';

const { PythonBridge } = NativeModules;

export interface QueryPayload {
  action: string;
  text?: string;
  audio_uri?: string;
  location?: {
    lat: number;
    lng: number;
    state: string;
  };
  language: string;
}

export interface ZoneCheckPayload {
  action: string;
  location: {
    lat: number;
    lng: number;
    state: string;
  };
}

export interface QueryResult {
  status: string;
  response_text?: string;
  response_audio_uri?: string;
  source_sections?: string[];
  confidence?: number;
  code?: string;
  message?: string;
  fallback_available?: boolean;
  fallback_response_text?: string;
}

export interface ZoneAlertResult {
  status: string;
  zone_type?: string;
  zone_name?: string;
  message?: string;
  suggested_query?: string;
  severity?: string;
}

export const executeQuery = async (payload: QueryPayload): Promise<QueryResult> => {
  try {
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

export const checkZones = async (payload: ZoneCheckPayload): Promise<ZoneAlertResult> => {
  try {
    const result = await PythonBridge.checkZones(JSON.stringify(payload));
    return JSON.parse(result) as ZoneAlertResult;
  } catch (error) {
    console.error('PythonBridge.checkZones error:', error);
    return { status: 'error' };
  }
};

export const initializePython = async (): Promise<string> => {
  try {
    const result = await PythonBridge.initializePython();
    return result;
  } catch (error) {
    console.error('PythonBridge.initializePython error:', error);
    throw error;
  }
};
