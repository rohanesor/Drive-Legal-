export class TestEnvironment {
  private mockClockTime = Date.now();
  private mockNetworkState: 'ONLINE' | 'OFFLINE' = 'ONLINE';
  private mockStorageVault: Map<string, any> = new Map();
  private mockGPSStatus = true;

  setClockTime(time: number): void {
    this.mockClockTime = time;
  }

  getClockTime(): number {
    return this.mockClockTime;
  }

  setNetworkState(state: 'ONLINE' | 'OFFLINE'): void {
    this.mockNetworkState = state;
  }

  getNetworkState(): 'ONLINE' | 'OFFLINE' {
    return this.mockNetworkState;
  }

  writeStorage(key: string, data: any): void {
    this.mockStorageVault.set(key, data);
  }

  readStorage(key: string): any {
    return this.mockStorageVault.get(key);
  }

  setGPSAvailable(available: boolean): void {
    this.mockGPSStatus = available;
  }

  isGPSAvailable(): boolean {
    return this.mockGPSStatus;
  }

  reset(): void {
    this.mockClockTime = Date.now();
    this.mockNetworkState = 'ONLINE';
    this.mockStorageVault.clear();
    this.mockGPSStatus = true;
  }
}
export default TestEnvironment;
