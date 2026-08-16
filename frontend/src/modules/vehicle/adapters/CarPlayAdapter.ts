import { DriverDisplayState } from '../types';

export class CarPlayAdapter {
  private activeState?: DriverDisplayState;

  updateDisplay(state: DriverDisplayState): void {
    this.activeState = state;
    console.log(`[CarPlayAdapter] Display updated: speed=${state.currentSpeed}/${state.speedLimit}`);
  }

  getActiveState(): DriverDisplayState | undefined {
    return this.activeState;
  }
}
export default CarPlayAdapter;
