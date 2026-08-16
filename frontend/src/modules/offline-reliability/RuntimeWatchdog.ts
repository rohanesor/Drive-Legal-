export interface SubsystemHeartbeat {
  id: string;
  lastHeartbeat: number;
  isStalled: boolean;
}

export class RuntimeWatchdog {
  private monitoredSubsystems: Map<string, SubsystemHeartbeat> = new Map();
  private watchdogTimeoutMs = 5000;

  registerSubsystem(id: string): void {
    this.monitoredSubsystems.set(id, {
      id,
      lastHeartbeat: Date.now(),
      isStalled: false,
    });
  }

  feedHeartbeat(id: string): void {
    const sub = this.monitoredSubsystems.get(id);
    if (sub) {
      sub.lastHeartbeat = Date.now();
      sub.isStalled = false;
    }
  }

  checkSubsystemHealth(): string[] {
    const stalledSubsystems: string[] = [];
    const now = Date.now();

    for (const sub of this.monitoredSubsystems.values()) {
      if (now - sub.lastHeartbeat > this.watchdogTimeoutMs) {
        sub.isStalled = true;
        stalledSubsystems.push(sub.id);
        console.warn(`[RuntimeWatchdog] Subsystem stalled detected: ${sub.id}`);
      }
    }
    return stalledSubsystems;
  }

  reset(): void {
    this.monitoredSubsystems.clear();
  }
}
export default RuntimeWatchdog;
