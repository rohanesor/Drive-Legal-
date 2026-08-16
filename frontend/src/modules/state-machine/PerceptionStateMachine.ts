import { PerceptionState } from './types';

export class PerceptionStateMachine {
  private state: PerceptionState = 'READY';

  getState(): PerceptionState {
    return this.state;
  }

  transition(next: PerceptionState): boolean {
    const prev = this.state;
    this.state = next;
    return this.state !== prev;
  }

  reset(): void {
    this.state = 'READY';
  }
}
export default PerceptionStateMachine;
