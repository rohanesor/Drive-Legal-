import { DrivingEvent, EventCategory } from './types';

export class EventNormalizer {
  static normalize(raw: Partial<DrivingEvent>): DrivingEvent {
    const id = raw.id || `evt_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = raw.timestamp || Date.now();
    const type = raw.type || 'SPEED_LIMIT_CHANGED';
    const source = raw.source || 'P1.2_PERCEPTION';
    const confidence = raw.confidence ?? 0.8;
    const severity = raw.severity || 'INFO';
    const urgency = raw.urgency || 'LOW';
    const status = raw.status || 'ACTIVE';
    const context = raw.context || {};
    const expiresAt = raw.expiresAt || (timestamp + 30000); // 30s TTL default

    let category: EventCategory = 'SAFETY';
    if (
      type === 'LEGAL_RESTRICTION' || 
      type === 'NO_ENTRY' || 
      type === 'NO_PARKING' || 
      type === 'NO_STOPPING' || 
      type === 'VEHICLE_RESTRICTION' || 
      type === 'TURN_RESTRICTION'
    ) {
      category = 'LEGAL';
    } else if (
      type === 'ROUTE_DEVIATION' || 
      type === 'REROUTE_REQUIRED' || 
      type === 'TURN_APPROACHING' || 
      type === 'DESTINATION_APPROACHING' || 
      type === 'ROAD_CLOSURE'
    ) {
      category = 'NAVIGATION';
    } else if (
      type === 'LOW_BATTERY' || 
      type === 'LOW_FUEL' || 
      type === 'VEHICLE_DISCONNECTED' || 
      type === 'TELEMETRY_DEGRADED'
    ) {
      category = 'VEHICLE';
    } else if (
      type === 'SCHOOL_ZONE' || 
      type === 'RAILWAY_CROSSING' || 
      type === 'PEDESTRIAN_ZONE' || 
      type === 'TOLL_APPROACHING'
    ) {
      category = 'ENVIRONMENT';
    }

    if (confidence < 0 || confidence > 1) {
      throw new Error('Invalid confidence range');
    }

    if (context && context.speed !== undefined && context.speed < 0) {
      throw new Error('Speed cannot be negative');
    }

    return {
      id,
      type,
      category,
      timestamp,
      location: raw.location,
      source,
      confidence,
      severity,
      urgency,
      status,
      context,
      expiresAt,
    };
  }
}
export default EventNormalizer;
