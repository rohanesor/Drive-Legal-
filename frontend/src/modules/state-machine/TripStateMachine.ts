import { TripState } from './types';

export class TripStateMachine {
  private state: TripState = 'IDLE';

  getState(): TripState {
    return this.state;
  }

  transition(next: TripState): boolean {
    const valid: Record<TripState, TripState[]> = {
      IDLE: ['PREPARING', 'ERROR'],
      PREPARING: ['STARTING', 'CANCELLED', 'ERROR'],
      STARTING: ['ACTIVE', 'CANCELLED', 'ERROR'],
      ACTIVE: ['PAUSED', 'ARRIVING', 'COMPLETING', 'ERROR'],
      PAUSED: ['ACTIVE', 'ERROR'],
      ARRIVING: ['COMPLETING', 'ERROR'],
      COMPLETING: ['COMPLETED', 'ERROR'],
      COMPLETED: ['IDLE'],
      CANCELLED: ['IDLE'],
      ERROR: ['IDLE'],
    };

    const allowed = valid[this.state];
    if (allowed && allowed.includes(next)) {
      this.state = next;
      return true;
    }
    return false;
  }

  reset(): void {
    this.state = 'IDLE';
  }
}
export default TripStateMachine;
