export type VoiceSessionState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'RESPONDING'
  | 'INTERRUPTED'
  | 'CANCELLED'
  | 'ERROR';

export type LanguageLocale = 'en-US' | 'ta-IN' | 'hi-IN';

export interface LanguageContext {
  language: 'English' | 'Tamil' | 'Hindi';
  locale: LanguageLocale;
  confidence: number;
}

export interface Transcript {
  text: string;
  confidence: number;
  language: LanguageContext;
  timestamp: number;
}

export type VoiceIntentType =
  | 'NAVIGATE_TO'
  | 'CHANGE_ROUTE'
  | 'FIND_SAFE_ROUTE'
  | 'ASK_SPEED_LIMIT'
  | 'ASK_CURRENT_SPEED'
  | 'ASK_DRIVESCORE'
  | 'EXPLAIN_ALERT'
  | 'ASK_LEGAL_RULE'
  | 'ASK_ROUTE_STATUS'
  | 'ASK_BATTERY'
  | 'ASK_RANGE'
  | 'CANCEL_NAVIGATION'
  | 'REPEAT_LAST_RESPONSE';

export interface VoiceIntent {
  type: VoiceIntentType;
  confidence: number;
  parameters: Record<string, any>;
}

export interface VoiceContext {
  currentLocation?: { latitude: number; longitude: number };
  currentRoad?: string;
  currentSpeed?: number;
  speedLimit?: number;
  navigationState?: string;
  activeAlerts?: any[];
  vehicleState?: any;
  routeState?: any;
  driverAttentionState?: string;
  language: LanguageContext;
}

export type DriverMode = 'PARKED' | 'DRIVING' | 'STOPPED_TEMPORARILY';

export interface VoiceAlertPayload {
  text: string;
  urgency: string;
  interrupt: boolean;
  repeatPolicy: string;
}

export interface VoiceSession {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  state: VoiceSessionState;
  context: VoiceContext;
  currentIntent?: VoiceIntent;
  activeResponse?: string;
}

export interface SpeechRecognizer {
  start(): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  getStatus(): 'IDLE' | 'LISTENING' | 'ERROR';
}

export interface SpeechSynthesizer {
  speak(text: string, options?: any): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}

export interface WakeDetector {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): 'IDLE' | 'LISTENING' | 'ERROR';
}
