import { 
  RoadSegment, MapProviderMode, RoadRestriction, 
  SpeedLimitContext 
} from './types';

export class MapProvider {
  private mode: MapProviderMode = 'ONLINE';

  constructor(mode: MapProviderMode = 'ONLINE') {
    this.mode = mode;
  }

  getMode(): MapProviderMode {
    return this.mode;
  }

  setMode(mode: MapProviderMode): void {
    this.mode = mode;
  }

  getRoadSegment(location: { latitude: number; longitude: number }): RoadSegment {
    return {
      id: 'seg_avinashi_road',
      geometry: [
        { latitude: 11.0168, longitude: 76.9558 },
        { latitude: 11.0175, longitude: 76.9585 },
      ],
      roadName: 'Avinashi Road',
      roadClass: 'urban',
      direction: 'both',
      lanes: 4,
      speedLimit: 80,
      speedLimitSource: 'map',
      oneWay: false,
      restrictions: [
        { type: 'NO_ENTRY', status: 'SUPPORTED', details: 'No entry for heavy vehicles.' },
        { type: 'ROAD_CLOSED', status: 'SUPPORTED' },
      ],
      confidence: this.mode === 'OFFLINE' ? 0.7 : 0.95,
    };
  }

  getRoadGeometry(segmentId: string): { latitude: number; longitude: number }[] {
    return [
      { latitude: 11.0168, longitude: 76.9558 },
      { latitude: 11.0175, longitude: 76.9585 },
    ];
  }

  getRoadRestrictions(segmentId: string): RoadRestriction[] {
    return [
      { type: 'NO_ENTRY', status: 'SUPPORTED', details: 'No entry for heavy vehicles.' },
      { type: 'ROAD_CLOSED', status: 'SUPPORTED' },
    ];
  }

  getSpeedLimit(segmentId: string): SpeedLimitContext {
    return {
      value: 80,
      source: 'VERIFIED_DATA',
      confidence: this.mode === 'OFFLINE' ? 0.8 : 0.98,
    };
  }

  getNearbyRoads(location: { latitude: number; longitude: number }): RoadSegment[] {
    return [
      this.getRoadSegment(location),
      {
        id: 'seg_cross_cut_road',
        geometry: [
          { latitude: 11.0180, longitude: 76.9560 },
          { latitude: 11.0190, longitude: 76.9570 },
        ],
        roadName: 'Cross Cut Road',
        roadClass: 'urban',
        direction: 'both',
        lanes: 2,
        speedLimit: 40,
        speedLimitSource: 'map',
        oneWay: true,
        restrictions: [],
        confidence: 0.9,
      },
    ];
  }
}
export default MapProvider;
