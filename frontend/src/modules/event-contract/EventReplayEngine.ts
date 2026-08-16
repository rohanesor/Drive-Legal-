import { DriveLegalEvent } from './types';

export class EventReplayEngine {
  /**
   * Replays recorded event streams back to the EventBus.
   * Enforces safetyMode parameter which sets the simulation metadata flag.
   */
  static async replay(
    events: DriveLegalEvent[],
    mode: 'REALTIME' | 'FAST' | 'STEP',
    eventBus: any,
    safetyMode = true
  ): Promise<void> {
    if (events.length === 0) return;

    let lastOccurredAt = events[0].occurredAt;

    for (const event of events) {
      const replayEvent: DriveLegalEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          runtimeMode: safetyMode ? 'DEMO' : event.metadata.runtimeMode,
        },
      };

      if (mode === 'REALTIME') {
        const diff = Math.max(0, event.occurredAt - lastOccurredAt);
        await new Promise((resolve) => setTimeout(resolve, Math.min(diff, 100)));
        lastOccurredAt = event.occurredAt;
      } else if (mode === 'STEP') {
        console.log(`[ReplayEngine] Stepped event: ${event.eventId}`);
      }

      await eventBus.publish(replayEvent);
    }
  }
}
export default EventReplayEngine;
