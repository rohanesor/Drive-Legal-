import { CameraFrame, VisionModel } from '../types';

export interface DetectedSign {
  type: 'SPEED_LIMIT' | 'NO_ENTRY' | 'NO_PARKING' | 'ONE_WAY' | 'SCHOOL_ZONE' | 'UNKNOWN';
  value: any;
  boundingBox: { x: number; y: number; w: number; h: number };
  confidence: number;
  timestamp: number;
}

export class TrafficSignDetector {
  private model?: VisionModel;

  constructor(model?: VisionModel) {
    this.model = model;
  }

  async detect(frame: CameraFrame): Promise<DetectedSign[]> {
    if (this.model) {
      const res = await this.model.infer(frame);
      return res;
    }
    return [];
  }
}
export default TrafficSignDetector;
