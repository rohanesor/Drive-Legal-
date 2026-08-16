import { DriveLegalEvent } from './types';

export class EventRecorder {
  private recordedEvents: DriveLegalEvent[] = [];
  private isRecording = false;

  startRecording(): void {
    this.recordedEvents = [];
    this.isRecording = true;
  }

  stopRecording(): void {
    this.isRecording = false;
  }

  recordEvent(event: DriveLegalEvent): void {
    if (!this.isRecording) return;

    if (event.eventType === 'location.updated' && event.sequence % 5 !== 0) {
      return;
    }

    this.recordedEvents.push(event);
  }

  getRecordedEvents(): DriveLegalEvent[] {
    return this.recordedEvents;
  }
}
export default EventRecorder;
