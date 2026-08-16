import { DriveLegalEvent } from './types';

export interface DeadLetterEvent {
  eventId: string;
  eventType: string;
  source: string;
  error: string;
  timestamp: number;
  originalEvent: DriveLegalEvent;
  retryCount: number;
}

export class DeadLetterQueue {
  private static dlq: DeadLetterEvent[] = [];

  static publishToDLQ(event: DriveLegalEvent, errorMessage: string, retryCount = 0): void {
    const dlqEvent: DeadLetterEvent = {
      eventId: event.eventId,
      eventType: event.eventType,
      source: event.source,
      error: errorMessage,
      timestamp: Date.now(),
      originalEvent: event,
      retryCount,
    };
    this.dlq.push(dlqEvent);
    console.warn(`[DeadLetterQueue] Event pushed to DLQ: ${event.eventId} due to: ${errorMessage}`);
  }

  static getDLQ(): DeadLetterEvent[] {
    return this.dlq;
  }

  static clear(): void {
    this.dlq = [];
  }

  /**
   * Evaluates if an event failure is retryable.
   * Schema validation, security violations and prohibited actions are non-retryable.
   */
  static isRetryable(error: string): boolean {
    const nonRetryableIndicators = [
      'Validation Error',
      'schema validation',
      'Security Violation',
      'prohibited action',
      'invalid enum',
      'Malformed Event',
    ];
    return !nonRetryableIndicators.some((ind) => error.toLowerCase().includes(ind.toLowerCase()));
  }
}
export default DeadLetterQueue;
