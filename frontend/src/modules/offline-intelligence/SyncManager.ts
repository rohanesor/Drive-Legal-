export interface SyncEvent {
  id: string;
  type: string;
  payload: any;
  priority: 'CRITICAL_SYNC' | 'NORMAL_SYNC' | 'ANALYTICS_SYNC';
  timestamp: number;
}

export class SyncManager {
  private queue: SyncEvent[] = [];
  private queueLimit = 100;

  enqueue(event: SyncEvent): void {
    if (this.queue.length >= this.queueLimit) {
      this.evictQueue();
    }
    this.queue.push(event);
  }

  getQueue(): SyncEvent[] {
    return this.queue;
  }

  resolveConflict(local: SyncEvent, server: SyncEvent): SyncEvent {
    if (local.timestamp >= server.timestamp) {
      return local;
    }
    return server;
  }

  private evictQueue(): void {
    const sorted = [...this.queue].sort((a, b) => {
      const priorities = { CRITICAL_SYNC: 3, NORMAL_SYNC: 2, ANALYTICS_SYNC: 1 };
      return priorities[a.priority] - priorities[b.priority];
    });

    if (sorted.length > 0) {
      const idToEvict = sorted[0].id;
      this.queue = this.queue.filter((e) => e.id !== idToEvict);
    }
  }
}
export default SyncManager;
