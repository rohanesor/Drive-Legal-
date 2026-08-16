import { 
  Observation, CameraFrame, GPSData, VehicleTelemetryData, 
  ObservationType 
} from './types';
import { CameraProvider } from './CameraProvider';
import { GPSProvider } from './GPSProvider';
import { VoiceProvider } from './VoiceProvider';
import { VehicleProvider } from './VehicleProvider';
import { TrafficSignDetector } from './detectors/TrafficSignDetector';
import { ObservationNormalizer } from './ObservationNormalizer';
import { ConfidenceEngine } from './ConfidenceEngine';
import { ObservationFusion } from './ObservationFusion';

export class PerceptionEngine {
  private cameraProvider: CameraProvider;
  private gpsProvider: GPSProvider;
  private voiceProvider: VoiceProvider;
  private vehicleProvider: VehicleProvider;
  private signDetector: TrafficSignDetector;

  private activeObservations: Observation[] = [];
  
  private temporalTracking: Map<ObservationType, {
    value: any;
    consecutiveCount: number;
    lastDetected: number;
  }> = new Map();

  private minConsecutiveDetections = 3;
  private confirmationWindowMs = 5000;
  private minConfidence = 0.5;

  private listeners: Record<string, ((event: any) => void)[]> = {
    observation_detected: [],
    observation_confirmed: [],
    observation_expired: [],
    sensor_health_changed: [],
  };

  constructor() {
    this.cameraProvider = new CameraProvider();
    this.gpsProvider = new GPSProvider();
    this.voiceProvider = new VoiceProvider();
    this.vehicleProvider = new VehicleProvider();
    this.signDetector = new TrafficSignDetector();

    this.cameraProvider.subscribe((frame) => this.processCameraFrame(frame));
    this.gpsProvider.subscribe((gps) => this.processGPS(gps));
    this.vehicleProvider.subscribe((telemetry) => this.processVehicleTelemetry(telemetry));
  }

  getCameraProvider(): CameraProvider { return this.cameraProvider; }
  getGPSProvider(): GPSProvider { return this.gpsProvider; }
  getVoiceProvider(): VoiceProvider { return this.voiceProvider; }
  getVehicleProvider(): VehicleProvider { return this.vehicleProvider; }
  getSignDetector(): TrafficSignDetector { return this.signDetector; }
  getActiveObservations(): Observation[] { return this.activeObservations; }

  setSignDetector(detector: TrafficSignDetector): void {
    this.signDetector = detector;
  }

  subscribeEvent(event: string, callback: (event: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  private publishEvent(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  private async processCameraFrame(frame: CameraFrame): Promise<void> {
    const detections = await this.signDetector.detect(frame);
    const now = Date.now();

    for (const d of detections) {
      if (d.confidence < this.minConfidence) {
        continue;
      }

      let obsType: ObservationType = 'SPEED_LIMIT_SIGN';
      if (d.type === 'NO_ENTRY') obsType = 'NO_ENTRY_SIGN';
      else if (d.type === 'NO_PARKING') obsType = 'NO_PARKING_SIGN';
      else if (d.type === 'ONE_WAY') obsType = 'ONE_WAY_SIGN';
      else if (d.type === 'SCHOOL_ZONE') obsType = 'SCHOOL_ZONE_SIGN';

      this.publishEvent('observation_detected', { type: obsType, value: d.value, confidence: d.confidence });

      let tracking = this.temporalTracking.get(obsType);
      if (!tracking || tracking.value !== d.value || (now - tracking.lastDetected > this.confirmationWindowMs)) {
        tracking = { value: d.value, consecutiveCount: 1, lastDetected: now };
      } else {
        tracking.consecutiveCount++;
        tracking.lastDetected = now;
      }
      this.temporalTracking.set(obsType, tracking);

      if (tracking.consecutiveCount >= this.minConsecutiveDetections) {
        const rawObs = ObservationNormalizer.normalizeSign(d, this.gpsProvider.getLastData());
        
        rawObs.confidence = ConfidenceEngine.calculateConfidence(
          rawObs.confidence,
          this.cameraProvider.getStatus(),
          1.1
        );
        rawObs.lifecycle = 'CONFIRMED';

        this.addOrUpdateObservation(rawObs);
        this.publishEvent('observation_confirmed', rawObs);
      }
    }

    this.cleanExpiredObservations();
  }

  private processGPS(gps: GPSData): void {
    const rawObs = ObservationNormalizer.normalizeGPS(
      gps.latitude,
      gps.longitude,
      gps.speed,
      gps.heading,
      gps.accuracy,
      gps.timestamp
    );
    this.addOrUpdateObservation(rawObs);
  }

  private processVehicleTelemetry(telemetry: VehicleTelemetryData): void {
    const gpsData = this.gpsProvider.getLastData();
    if (gpsData && telemetry.speed !== undefined) {
      const gpsObs = ObservationNormalizer.normalizeGPS(
        gpsData.latitude,
        gpsData.longitude,
        gpsData.speed,
        gpsData.heading,
        gpsData.accuracy,
        gpsData.timestamp
      );

      const telObs: Observation = {
        id: `obs_telemetry_${Date.now()}`,
        type: 'ROAD_RESTRICTION',
        timestamp: telemetry.timestamp,
        value: { speed: telemetry.speed, heading: telemetry.heading || gpsData.heading, accuracy: 0 },
        confidence: 0.99,
        source: 'TELEMETRY',
        scope: 'POINT',
        lifecycle: 'ACTIVE',
      };

      const fused = ObservationFusion.fuse(undefined, gpsObs, telObs);
      if (fused && !('candidates' in fused)) {
        this.addOrUpdateObservation(fused);
      }
    }
  }

  private addOrUpdateObservation(obs: Observation): void {
    const index = this.activeObservations.findIndex(
      (o) => o.type === obs.type && o.source === obs.source
    );

    if (index !== -1) {
      this.activeObservations[index] = obs;
    } else {
      this.activeObservations.push(obs);
    }
  }

  private cleanExpiredObservations(): void {
    const now = Date.now();
    this.activeObservations = this.activeObservations.filter((obs) => {
      if (obs.expiresAt && obs.expiresAt < now) {
        this.publishEvent('observation_expired', obs);
        return false;
      }
      return true;
    });
  }
}
export default PerceptionEngine;
