import { CameraFrame } from '../types';

export interface DetectedLane {
  departureWarning: boolean;
  confidence: number;
  timestamp: number;
}

export class LaneDetector {
  async detect(frame: CameraFrame): Promise<DetectedLane | null> {
    return null;
  }
}
export default LaneDetector;
