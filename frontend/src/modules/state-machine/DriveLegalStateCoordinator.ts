import { 
  DriveLegalStateSnapshot, StateTransition 
} from './types';
import { TripStateMachine } from './TripStateMachine';
import { MotionStateMachine } from './MotionStateMachine';
import { NavigationStateMachine } from './NavigationStateMachine';
import { SafetyStateMachine } from './SafetyStateMachine';
import { AlertStateMachine } from './AlertStateMachine';
import { ConnectivityStateMachine } from './ConnectivityStateMachine';
import { PerceptionStateMachine } from './PerceptionStateMachine';
import { VehicleStateMachine } from './VehicleStateMachine';
import { EventBus } from '../runtime/EventBus';

export class DriveLegalStateCoordinator {
  private tripSM = new TripStateMachine();
  private motionSM = new MotionStateMachine();
  private navSM = new NavigationStateMachine();
  private safetySM = new SafetyStateMachine();
  private alertSM = new AlertStateMachine();
  private connSM = new ConnectivityStateMachine();
  private percSM = new PerceptionStateMachine();
  private vehSM = new VehicleStateMachine();

  private lastEventTimestamp = 0;
  private transitionHistory: StateTransition[] = [];
  private maxHistorySize = 100;
  private eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
    if (this.eventBus) {
      this.setupSubscriptions();
    }
  }

  private setupSubscriptions(): void {
    const handleSpeed = (event: any) => {
      if (this.isStale(event.timestamp)) return;
      const speed = event.payload.speed;
      const changed = this.motionSM.updateSpeed(speed);
      if (changed) {
        this.logTransition('motion', this.motionSM.getState(), event.type, 'Speed changed telemetry update');
      }
    };
    this.eventBus!.subscribe('SPEED_UPDATED', handleSpeed);
    this.eventBus!.subscribe('speed.updated', handleSpeed);

    const handleHazard = (event: any) => {
      if (this.isStale(event.timestamp)) return;
      const changed = this.safetySM.transition('HIGH');
      if (changed) {
        this.logTransition('safety', this.safetySM.getState(), event.type, 'Hazard observed/detected');
      }
    };
    this.eventBus!.subscribe('CAMERA_OBSERVATION', handleHazard);
    this.eventBus!.subscribe('hazard.detected', handleHazard);
    this.eventBus!.subscribe('CAMERA_HAZARD', handleHazard);

    const handleTripStart = (event: any) => {
      if (this.isStale(event.timestamp)) return;
      const changed = this.tripSM.transition('PREPARING');
      if (changed) {
        this.logTransition('trip', this.tripSM.getState(), event.type, 'Trip starting process initiated');
      }
    };
    this.eventBus!.subscribe('TRIP_STARTED', handleTripStart);
    this.eventBus!.subscribe('trip.started', handleTripStart);

    const handleTripComplete = (event: any) => {
      if (this.isStale(event.timestamp)) return;
      this.tripSM.transition('COMPLETING');
      const changed = this.tripSM.transition('COMPLETED');
      if (changed) {
        this.logTransition('trip', this.tripSM.getState(), event.type, 'Trip completed successfully');
      }
    };
    this.eventBus!.subscribe('TRIP_COMPLETED', handleTripComplete);
    this.eventBus!.subscribe('trip.completed', handleTripComplete);
  }

  private isStale(timestamp: number): boolean {
    if (timestamp < this.lastEventTimestamp) {
      return true;
    }
    this.lastEventTimestamp = timestamp;
    return false;
  }

  getCurrentSnapshot(): DriveLegalStateSnapshot {
    return {
      timestamp: Date.now(),
      trip: this.tripSM.getState(),
      motion: this.motionSM.getState(),
      navigation: this.navSM.getState(),
      safety: this.safetySM.getState(),
      alerts: this.alertSM.getState(),
      connectivity: this.connSM.getState(),
      perception: this.percSM.getState(),
      vehicle: this.vehSM.getState(),
      highestPriorityAlert: this.alertSM.getHighestPriorityAlert(),
      contextVersion: '1.0',
      stateVersion: '1.0',
    };
  }

  getTransitionHistory(): StateTransition[] {
    return this.transitionHistory;
  }

  private logTransition(
    domain: StateTransition['domain'],
    nextState: string,
    event: string,
    reason: string
  ): void {
    const prevMap: Record<string, string> = {
      trip: this.tripSM.getState(),
      motion: this.motionSM.getState(),
      navigation: this.navSM.getState(),
      safety: this.safetySM.getState(),
      alerts: this.alertSM.getState(),
      connectivity: this.connSM.getState(),
      perception: this.percSM.getState(),
      vehicle: this.vehSM.getState(),
    };

    const transition: StateTransition = {
      transitionId: `trans_${Date.now()}_${Math.random()}`,
      domain,
      previousState: prevMap[domain] || 'UNKNOWN',
      nextState,
      event,
      timestamp: Date.now(),
      reason,
      confidence: 1.0,
    };

    this.transitionHistory.push(transition);
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory.shift();
    }

    if (this.eventBus) {
      this.eventBus.publish({
        id: `ev_state_chg_${Date.now()}`,
        type: `${domain.toUpperCase()}_STATE_CHANGED`,
        timestamp: Date.now(),
        source: 'state-machine',
        correlationId: `corr_state_${Date.now()}`,
        tripId: 'runtime_state',
        payload: { previous: transition.previousState, next: transition.nextState },
        schemaVersion: '1.0',
      });
    }
  }

  getTripSM() { return this.tripSM; }
  getMotionSM() { return this.motionSM; }
  getNavSM() { return this.navSM; }
  getSafetySM() { return this.safetySM; }
  getAlertSM() { return this.alertSM; }
  getConnSM() { return this.connSM; }
  getPercSM() { return this.percSM; }
  getVehSM() { return this.vehSM; }

  resetRuntimeState(caller: string): void {
    if (caller !== 'SYSTEM') {
      throw new Error('Access Denied: Reset runtime state can only be triggered by SYSTEM call.');
    }

    this.tripSM.reset();
    this.motionSM.reset();
    this.navSM.reset();
    this.safetySM.reset();
    this.alertSM.reset();
    this.connSM.reset();
    this.percSM.reset();
    this.vehSM.reset();
    this.lastEventTimestamp = 0;
    this.transitionHistory = [];
  }
}
export default DriveLegalStateCoordinator;
