/**
 * DriveLegal Connection Manager
 *
 * Tracks network connectivity + actual backend reachability.
 * Exposes an observable connection status that screens can subscribe to.
 *
 * Strategy:
 * - Uses NetInfo for network state detection
 * - Validates actual server reachability via GET /health
 * - Polls every 60s when online, every 10s when recovering
 * - Avoids excessive polling
 */
import { apiService } from './apiService';
import { CONFIG } from '../config';

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'server_error';

type StatusListener = (status: ConnectionStatus) => void;

class ConnectionManager {
  private status: ConnectionStatus = 'connecting';
  private listeners: StatusListener[] = [];
  private healthCheckTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize the connection manager.
   * Call once on app startup.
   */
  start(): void {
    this.setStatus('connecting');
    this.checkHealth();
  }

  /**
   * Stop all polling and listeners.
   */
  stop(): void {
    this.stopHealthCheck();
  }

  /**
   * Get current status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if the backend is reachable right now.
   */
  isOnline(): boolean {
    return this.status === 'online';
  }

  /**
   * Subscribe to connection status changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: StatusListener): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Check health of server.
   */
  async checkHealth(): Promise<boolean> {
    try {
      await apiService.health();
      this.setStatus('online');
      this.scheduleHealthCheck(CONFIG.HEALTH_CHECK_INTERVAL_MS);
      return true;
    } catch (e: unknown) {
      const isNetError = (e as any)?.type === 'network' || (e as any)?.type === 'timeout';
      if (isNetError) {
        this.setStatus('offline');
      } else {
        this.setStatus('server_error');
      }
      this.scheduleHealthCheck(CONFIG.HEALTH_CHECK_RECOVERY_INTERVAL_MS);
      return false;
    }
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const listener of this.listeners) {
        try {
          listener(newStatus);
        } catch (e) {
          console.error('ConnectionManager listener error:', e);
        }
      }
    }
  }

  private scheduleHealthCheck(intervalMs: number): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setTimeout(() => {
      this.checkHealth();
    }, intervalMs);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}

export const connectionManager = new ConnectionManager();
