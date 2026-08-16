import { Observation } from '../types';
import { LegalContext } from '../../legal/types';
import { DriverRiskContext } from '../../risk/types';

export class P0Adapter {
  /**
   * Adapts active perception observations to P0.4 LegalContext variables.
   */
  static adaptToLegalContext(
    observations: Observation[],
    baseContext: LegalContext
  ): LegalContext {
    const updated = {
      ...baseContext,
      roadContext: { ...baseContext.roadContext },
    };

    for (const obs of observations) {
      if (obs.lifecycle !== 'CONFIRMED' && obs.lifecycle !== 'ACTIVE') continue;

      if (obs.type === 'SPEED_LIMIT_SIGN') {
        updated.roadContext.applicableSpeedLimit = Number(obs.value);
      } else if (obs.type === 'NO_ENTRY_SIGN') {
        updated.roadContext.isNoEntry = !!obs.value;
      } else if (obs.type === 'ONE_WAY_SIGN') {
        updated.roadContext.isOneWay = !!obs.value;
      } else if (obs.type === 'SCHOOL_ZONE_SIGN') {
        updated.roadContext.isSchoolZone = !!obs.value;
      }
    }

    return updated;
  }

  /**
   * Adapts active perception observations to P0.3 DriverRiskContext variables.
   */
  static adaptToRiskContext(
    observations: Observation[],
    baseContext: DriverRiskContext
  ): DriverRiskContext {
    const updated = { ...baseContext };

    for (const obs of observations) {
      if (obs.lifecycle !== 'CONFIRMED' && obs.lifecycle !== 'ACTIVE') continue;

      if (obs.type === 'SPEED_LIMIT_SIGN') {
        updated.roadContext.currentSpeedLimit = Number(obs.value);
      } else if (obs.type === 'SCHOOL_ZONE_SIGN') {
        updated.roadContext.isSchoolZone = !!obs.value;
      } else if (obs.type === 'ROAD_HAZARD') {
        updated.roadContext.isRestrictedRoad = true;
      }
    }

    return updated;
  }
}
export default P0Adapter;
