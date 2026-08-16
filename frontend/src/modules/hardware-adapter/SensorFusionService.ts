export class SensorFusionService {
  private lastGpsSpeed: number | null = null;
  private lastVehicleSpeed: number | null = null;
  private authorityPreferred: 'VEHICLE' | 'GPS' = 'VEHICLE';

  updateGpsSpeed(speed: number): { fusedSpeed: number; discrepancyDetected: boolean } {
    this.lastGpsSpeed = speed;
    return this.fuseSpeeds();
  }

  updateVehicleSpeed(speed: number): { fusedSpeed: number; discrepancyDetected: boolean } {
    this.lastVehicleSpeed = speed;
    return this.fuseSpeeds();
  }

  private fuseSpeeds(): { fusedSpeed: number; discrepancyDetected: boolean } {
    if (this.lastGpsSpeed !== null && this.lastVehicleSpeed !== null) {
      const diff = Math.abs(this.lastGpsSpeed - this.lastVehicleSpeed);
      const discrepancyDetected = diff > 15;

      if (discrepancyDetected) {
        console.warn(`[SensorFusionService] Sensor disagreement detected: GPS Speed: ${this.lastGpsSpeed}, Vehicle Speed: ${this.lastVehicleSpeed}`);
      }

      const fusedSpeed =
        this.authorityPreferred === 'VEHICLE' ? this.lastVehicleSpeed : this.lastGpsSpeed;

      return { fusedSpeed, discrepancyDetected };
    }

    const fusedSpeed = this.lastVehicleSpeed !== null ? this.lastVehicleSpeed : (this.lastGpsSpeed || 0);
    return { fusedSpeed, discrepancyDetected: false };
  }
}
export default SensorFusionService;
