import { CameraFrame } from '../types';

export interface DetectedVehicle {
  type: 'CAR' | 'TRUCK' | 'MOTORCYCLE';
  distanceMeters: number;
  confidence: number;
  timestamp: number;
}

export class VehicleDetector {
  async detect(frame: CameraFrame): Promise<DetectedVehicle[]> {
    return [];
  }
}
export default VehicleDetector;
