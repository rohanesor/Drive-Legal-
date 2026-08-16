import { SafetyState } from './types';

export class SafetyStateMachine {
  private state: SafetyState = 'NORMAL';
  private clearConfirmationCount = 0;
  private requiredClearConfirmations = 3;

  getState(): SafetyState {
    return this.state;
  }

  transition(next: SafetyState): boolean {
    const riskLevels: Record<SafetyState, number> = {
      UNKNOWN: 0,
      NORMAL: 1,
      ELEVATED: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    const currentLevel = riskLevels[this.state];
    const nextLevel = riskLevels[next];

    if (nextLevel > currentLevel) {
      this.state = next;
      this.clearConfirmationCount = 0;
      return true;
    } else if (nextLevel < currentLevel) {
      this.clearConfirmationCount++;
      if (this.clearConfirmationCount >= this.requiredClearConfirmations) {
        this.state = next;
        this.clearConfirmationCount = 0;
        return true;
      }
    } else {
      this.clearConfirmationCount = 0;
    }

    return false;
  }

  reset(): void {
    this.state = 'NORMAL';
    this.clearConfirmationCount = 0;
  }
}
export default SafetyStateMachine;
