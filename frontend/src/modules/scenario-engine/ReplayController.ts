import { ReplayState } from './types';
import { DriveLegalEvent } from '../event-contract/types';
import { EventBus } from '../runtime/EventBus';

export class ReplayController {
  private state: ReplayState = 'IDLE';
  private events: DriveLegalEvent[] = [];
  private currentEventIndex = 0;
  private speedMultiplier = 1;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  loadReplay(events: DriveLegalEvent[]): void {
    this.events = events;
    this.currentEventIndex = 0;
    this.state = 'READY';
  }

  getReplayState(): ReplayState {
    return this.state;
  }

  async startReplay(): Promise<void> {
    if (this.state !== 'READY') return;
    this.state = 'PLAYING';
    await this.playLoop();
  }

  pauseReplay(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    }
  }

  resumeReplay(): void {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.playLoop();
    }
  }

  async stepReplay(): Promise<void> {
    if (this.currentEventIndex < this.events.length) {
      const event = this.events[this.currentEventIndex];
      this.currentEventIndex++;
      await this.eventBus.publish(event);
      if (this.currentEventIndex >= this.events.length) {
        this.state = 'COMPLETED';
      }
    }
  }

  stopReplay(): void {
    this.state = 'IDLE';
    this.currentEventIndex = 0;
  }

  setReplaySpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  private async playLoop(): Promise<void> {
    while (this.state === 'PLAYING' && this.currentEventIndex < this.events.length) {
      await this.stepReplay();
      await new Promise((resolve) => setTimeout(resolve, 50 / this.speedMultiplier));
    }
  }
}
export default ReplayController;
