import { MotionState } from './types';

export class MotionStateMachine {
  private state: MotionState = 'PARKED';
  private movingThreshold = 5;
  private stopThreshold = 2;

  getState(): MotionState {
    return this.state;
  }

  updateSpeed(speedKmH: number): boolean {
    const prev = this.state;
    if (prev === 'PARKED' || prev === 'STOPPED') {
      if (speedKmH >= this.movingThreshold) {
        this.state = 'MOVING';
      } else if (speedKmH > this.stopThreshold) {
        this.state = 'SLOW_MOVING';
      }
    } else if (prev === 'MOVING') {
      if (speedKmH <= this.stopThreshold) {
        this.state = 'STOPPED';
      } else if (speedKmH < this.movingThreshold) {
        this.state = 'SLOW_MOVING';
      }
    } else if (prev === 'SLOW_MOVING') {
      if (speedKmH >= this.movingThreshold) {
        this.state = 'MOVING';
      } else if (speedKmH <= this.stopThreshold) {
        this.state = 'STOPPED';
      }
    }

    return this.state !== prev;
  }

  setParked(): void {
    this.state = 'PARKED';
  }

  reset(): void {
    this.state = 'PARKED';
  }
}
export default MotionStateMachine;
