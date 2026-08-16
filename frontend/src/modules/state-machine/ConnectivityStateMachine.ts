import { ConnectivityState } from './types';

export class ConnectivityStateMachine {
  private state: ConnectivityState = 'ONLINE';
  private disconnectCount = 0;
  private requiredDisconnectsForOffline = 3;

  getState(): ConnectivityState {
    return this.state;
  }

  transition(next: ConnectivityState): boolean {
    const prev = this.state;
    if (next === 'OFFLINE') {
      this.disconnectCount++;
      if (this.disconnectCount >= this.requiredDisconnectsForOffline) {
        this.state = 'OFFLINE';
        this.disconnectCount = 0;
        return this.state !== prev;
      }
      this.state = 'DEGRADED';
      return this.state !== prev;
    }

    if (next === 'ONLINE') {
      this.disconnectCount = 0;
      if (prev === 'OFFLINE') {
        this.state = 'RECOVERING';
        return true;
      }
      this.state = 'ONLINE';
      return this.state !== prev;
    }

    this.state = next;
    return this.state !== prev;
  }

  reset(): void {
    this.state = 'ONLINE';
    this.disconnectCount = 0;
  }
}
export default ConnectivityStateMachine;
