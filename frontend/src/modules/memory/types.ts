export interface ShortTermContext {
  activeSpeedingPersistenceSeconds: number;
  recentSwervingDetected: boolean;
  currentManeuverInstruction?: string;
  lastBrakingIntensity: number; // m/s^2
}

export interface TripMemory {
  tripId: string;
  startTime: number;
  tripScore: number;
  distanceTraveledMeters: number;
  durationSeconds: number;
  loggedIncidentsCount: Record<string, number>; // mapping event type -> count
  startLocation: { latitude: number; longitude: number };
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationMemory {
  sessionId: string;
  turns: ConversationTurn[];
  summary?: string;
}

export interface LearnedPattern {
  patternId: string;
  category: 'SPEEDING' | 'HARSH_BRAKING' | 'ROUTE_CHOICE';
  frequency: number;
  lastObserved: number;
  explanation: string;
}

export interface LongTermDriverMemory {
  driverId: string;
  averageDriveScore: number;
  tripsCount: number;
  frequentlyVisitedCities: string[];
  learnedPatterns: LearnedPattern[];
  preferences: {
    voiceEnabled: boolean;
    alertFrequency: 'high' | 'medium' | 'low';
    navigationAlerts: boolean;
    legalAlerts: boolean;
    safetyAlerts: boolean;
  };
}

export interface DriveMemory {
  shortTerm: ShortTermContext;
  currentTrip?: TripMemory;
  conversation: ConversationMemory;
  longTerm: LongTermDriverMemory;
}
