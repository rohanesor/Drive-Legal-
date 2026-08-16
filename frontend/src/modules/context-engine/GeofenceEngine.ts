import { Zone } from './types';

export class GeofenceEngine {
  private activeZones: Set<string> = new Set();
  private enteringCount: Map<string, number> = new Map();
  private exitingCount: Map<string, number> = new Map();
  private threshold = 3;

  updatePosition(
    lat: number,
    lon: number,
    zones: Zone[]
  ): { entered: string[]; exited: string[]; active: string[] } {
    const entered: string[] = [];
    const exited: string[] = [];

    zones.forEach((zone) => {
      const dist = this.calculateDistance(
        lat,
        lon,
        zone.geometry.latitude,
        zone.geometry.longitude
      );
      const isInside = dist <= zone.geometry.radiusMeters;

      if (isInside) {
        this.exitingCount.set(zone.id, 0);
        if (!this.activeZones.has(zone.id)) {
          const count = (this.enteringCount.get(zone.id) || 0) + 1;
          this.enteringCount.set(zone.id, count);

          if (count >= this.threshold) {
            this.activeZones.add(zone.id);
            entered.push(zone.id);
            this.enteringCount.set(zone.id, 0);
          }
        }
      } else {
        this.enteringCount.set(zone.id, 0);
        if (this.activeZones.has(zone.id)) {
          const count = (this.exitingCount.get(zone.id) || 0) + 1;
          this.exitingCount.set(zone.id, count);

          if (count >= this.threshold) {
            this.activeZones.delete(zone.id);
            exited.push(zone.id);
            this.exitingCount.set(zone.id, 0);
          }
        }
      }
    });

    return { entered, exited, active: Array.from(this.activeZones) };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  reset(): void {
    this.activeZones.clear();
    this.enteringCount.clear();
    this.exitingCount.clear();
  }
}
export default GeofenceEngine;
