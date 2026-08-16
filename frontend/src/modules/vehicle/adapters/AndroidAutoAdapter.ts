import { DriverDisplayState } from '../types';

export class AndroidAutoAdapter {
  private activeState?: DriverDisplayState;

  updateDisplay(state: DriverDisplayState): void {
    this.activeState = state;
    console.log(`[AndroidAutoAdapter] Display updated: speed=${state.currentSpeed}/${state.speedLimit}`);
  }

  getActiveState(): DriverDisplayState | undefined {
    return this.activeState;
  }
}
export default AndroidAutoAdapter;
