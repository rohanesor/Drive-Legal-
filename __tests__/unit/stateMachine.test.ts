import { DriveLegalStateCoordinator } from '../../frontend/src/modules/state-machine/DriveLegalStateCoordinator';
import { EventBus } from '../../frontend/src/modules/runtime/EventBus';

describe('Real-Time Driving State Machine (P2.1)', () => {
  let coordinator: DriveLegalStateCoordinator;

  beforeEach(() => {
    coordinator = new DriveLegalStateCoordinator();
  });

  test('1. TripStateMachine validates valid lifecycle transitions', () => {
    const trip = coordinator.getTripSM();
    expect(trip.getState()).toBe('IDLE');

    // IDLE -> PREPARING works
    expect(trip.transition('PREPARING')).toBe(true);

    // PREPARING -> STARTING works
    expect(trip.transition('STARTING')).toBe(true);

    // STARTING -> ACTIVE works
    expect(trip.transition('ACTIVE')).toBe(true);

    // Invalid transition directly from ACTIVE to COMPLETED (must go through COMPLETING)
    expect(trip.transition('COMPLETED')).toBe(false);
    expect(trip.getState()).toBe('ACTIVE');

    expect(trip.transition('COMPLETING')).toBe(true);
    expect(trip.transition('COMPLETED')).toBe(true);

    // COMPLETED back to ACTIVE directly -> invalid
    expect(trip.transition('ACTIVE')).toBe(false);
  });

  test('2. MotionStateMachine speed hysteresis prevents oscillation around thresholds', () => {
    const motion = coordinator.getMotionSM();
    expect(motion.getState()).toBe('PARKED');

    // 1. Enter MOVING: speed >= 5 km/h
    motion.updateSpeed(3);
    expect(motion.getState()).toBe('SLOW_MOVING');

    motion.updateSpeed(6);
    expect(motion.getState()).toBe('MOVING');

    // 2. Fluctuations around threshold (e.g. drop to 4 km/h) -> does NOT drop immediately to STOPPED
    motion.updateSpeed(4);
    expect(motion.getState()).toBe('SLOW_MOVING');

    // 3. Drop to 2 km/h -> drops to STOPPED
    motion.updateSpeed(1.5);
    expect(motion.getState()).toBe('STOPPED');
  });

  test('3. NavigationStateMachine tracks routing lifecycles', () => {
    const nav = coordinator.getNavSM();
    expect(nav.getState()).toBe('NO_ROUTE');

    expect(nav.transition('ROUTE_PLANNED')).toBe(true);
    expect(nav.transition('NAVIGATING')).toBe(true);
    expect(nav.transition('OFF_ROUTE')).toBe(true);
    expect(nav.transition('REROUTING')).toBe(true);
    expect(nav.transition('NAVIGATING')).toBe(true);
  });

  test('4. SafetyStateMachine implements immediate escalation and persistent de-escalation', () => {
    const safety = coordinator.getSafetySM();
    expect(safety.getState()).toBe('NORMAL');

    // Escalates to CRITICAL immediately on first observation
    expect(safety.transition('CRITICAL')).toBe(true);
    expect(safety.getState()).toBe('CRITICAL');

    // De-escalates to NORMAL only after 3 consecutive observations
    expect(safety.transition('NORMAL')).toBe(false); // observation 1
    expect(safety.getState()).toBe('CRITICAL');

    expect(safety.transition('NORMAL')).toBe(false); // observation 2
    expect(safety.getState()).toBe('CRITICAL');

    expect(safety.transition('NORMAL')).toBe(true); // observation 3 -> transitions!
    expect(safety.getState()).toBe('NORMAL');
  });

  test('5. AlertStateMachine tracks multiple alerts and highest priority alert message', () => {
    const alert = coordinator.getAlertSM();
    expect(alert.getState()).toBe('NONE');

    // Add low alert
    alert.addAlert({
      id: 'a1',
      type: 'SPEEDING',
      severity: 'LOW',
      message: 'Slightly speeding',
      timestamp: Date.now(),
    });
    expect(alert.getState()).toBe('ACTIVE');
    expect(alert.getHighestPriorityAlert()).toBe('Slightly speeding');

    // Add critical alert
    alert.addAlert({
      id: 'a2',
      type: 'COLLISION',
      severity: 'CRITICAL',
      message: 'Crash imminent!',
      timestamp: Date.now(),
    });
    expect(alert.getHighestPriorityAlert()).toBe('Crash imminent!');
  });

  test('6. ConnectivityStateMachine debounces network offline switches', () => {
    const conn = coordinator.getConnSM();
    expect(conn.getState()).toBe('ONLINE');

    // Single offline drop -> transitions to DEGRADED
    expect(conn.transition('OFFLINE')).toBe(true);
    expect(conn.getState()).toBe('DEGRADED');

    // Second and third drop -> transitions to OFFLINE
    conn.transition('OFFLINE');
    conn.transition('OFFLINE');
    expect(conn.getState()).toBe('OFFLINE');
  });

  test('7. Reset runtime state is allowed only via SYSTEM caller', () => {
    coordinator.getTripSM().transition('PREPARING');

    // Trigger reset by agent -> denied
    expect(() => coordinator.resetRuntimeState('AGENT')).toThrow('Access Denied');

    // Trigger reset by SYSTEM -> succeeds
    coordinator.resetRuntimeState('SYSTEM');
    expect(coordinator.getTripSM().getState()).toBe('IDLE');
  });
});
