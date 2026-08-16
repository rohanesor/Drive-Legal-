import { CameraFrame } from '../types';

export interface DetectedRoadFeature {
  type: 'ROAD_HAZARD' | 'TRAFFIC_LIGHT' | 'RESTRICTION';
  value: string;
  confidence: number;
  timestamp: number;
}

export class RoadFeatureDetector {
  async detect(frame: CameraFrame): Promise<DetectedRoadFeature[]> {
    return [];
  }
}
export default RoadFeatureDetector;
