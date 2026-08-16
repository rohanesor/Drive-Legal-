export type AdapterState =
  | 'DISCOVERED'
  | 'INITIALIZING'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'FAILED'
  | 'STOPPED';

export interface AdapterCapabilities {
  location?: boolean;
  altitude?: boolean;
  heading?: boolean;
  speed?: boolean;
  accuracy?: boolean;
  frameCapture?: boolean;
  audioInput?: boolean;
  obdRead?: boolean;
  bleScan?: boolean;
}

export interface DeviceIdentity {
  deviceId: string;
  adapterId: string;
  manufacturer: string;
  model: string;
  firmware: string;
  connectionType: string;
}

export interface AdapterHealth {
  status: AdapterState;
  lastSeen: number;
  latency: number;
  errorRate: number;
  droppedSamples: number;
  reconnectCount: number;
}

export interface HardwareAdapter {
  id: string;
  type: string;
  version: string;

  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;

  getStatus(): AdapterState;
  getCapabilities(): AdapterCapabilities;

  healthCheck(): Promise<AdapterHealth>;

  subscribe(callback: (event: any) => void): void;

  dispose(): Promise<void>;
}
