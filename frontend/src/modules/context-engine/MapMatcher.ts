import { RoadContext } from './types';

export class MapMatcher {
  private offlineRoads: RoadContext[] = [
    {
      roadId: 'rd_highway_1',
      roadName: 'Highway-101',
      roadClass: 'HIGHWAY',
      laneCount: 3,
      direction: 'both',
      surfaceType: 'asphalt',
      accessType: 'public',
    },
    {
      roadId: 'rd_residential_1',
      roadName: 'Main St',
      roadClass: 'RESIDENTIAL',
      laneCount: 1,
      direction: 'both',
      surfaceType: 'concrete',
      accessType: 'public',
    },
  ];

  matchRoad(
    latitude: number,
    longitude: number,
    heading: number,
    speed: number
  ): { road: RoadContext; confidence: number; mapDataVersion: string } {
    let selectedRoad = this.offlineRoads[1];
    let confidence = 0.85;

    if (speed > 60) {
      selectedRoad = this.offlineRoads[0];
      confidence = 0.95;
    }

    return {
      road: selectedRoad,
      confidence,
      mapDataVersion: 'IN-2026-07',
    };
  }
}
export default MapMatcher;
