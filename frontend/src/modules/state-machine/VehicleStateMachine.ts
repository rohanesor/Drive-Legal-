import { VehicleState } from './types';

export class VehicleStateMachine {
  private state: VehicleState = 'AVAILABLE';

  getState(): VehicleState {
    return this.state;
  }

  transition(next: VehicleState): boolean {
    const prev = this.state;
    this.state = next;
    return this.state !== prev;
  }

  reset(): void {
    this.state = 'AVAILABLE';
  }
}
export default VehicleStateMachine;
