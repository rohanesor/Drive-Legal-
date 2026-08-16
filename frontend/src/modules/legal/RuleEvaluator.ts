import { TrafficRule, LegalContext } from './types';
import { COMPLIANCE_TOLERANCES } from './constants';

export interface RuleEvaluationResult {
  status: 'COMPLIANT' | 'WARNING' | 'VIOLATION' | 'UNKNOWN';
  evidence: string;
  explanation: string;
  confidence: number;
}

export class RuleEvaluator {
  /**
   * Evaluates a single TrafficRule against the current LegalContext.
   */
  static evaluateRule(rule: TrafficRule, context: LegalContext): RuleEvaluationResult {
    const { vehicleContext, evidenceConfidence = 1.0 } = context;

    // Safety checks for emergency vehicles (they are generally exempt from speed and access limits)
    if (vehicleContext.isEmergencyVehicle) {
      return {
        status: 'COMPLIANT',
        evidence: 'Exempted emergency vehicle status.',
        explanation: 'Vehicle has active emergency status exemptions from typical restrictions.',
        confidence: 1.0,
      };
    }

    const rawResult = this.evaluateRuleRaw(rule, context);
    return {
      ...rawResult,
      confidence: rawResult.confidence * evidenceConfidence,
    };
  }

  private static evaluateRuleRaw(rule: TrafficRule, context: LegalContext): RuleEvaluationResult {
    const { vehicleContext, roadContext, driverBehavior, signDetectionContext, evidenceConfidence = 1.0 } = context;

    switch (rule.category) {
      case 'SPEED_LIMIT': {
        const limit = roadContext.applicableSpeedLimit;
        const speed = vehicleContext.currentSpeed;
        if (limit === 0) {
          return {
            status: 'UNKNOWN',
            evidence: 'Speed limit data is unavailable for this road segment.',
            explanation: 'Cannot verify speed compliance because speed limit data is not seeded.',
            confidence: 0.5,
          };
        }

        const margin = COMPLIANCE_TOLERANCES.SPEEDING_MARGIN_KMH;
        if (speed <= limit + margin) {
          return {
            status: 'COMPLIANT',
            evidence: `Speed ${speed} km/h <= Limit ${limit} km/h + Margin ${margin} km/h.`,
            explanation: 'Vehicle speed is within the legal compliance speed limits.',
            confidence: evidenceConfidence,
          };
        } else {
          // Exceeds limit. Apply persistence checks.
          const persistence = driverBehavior.speedingPersistenceSeconds;
          const excess = speed - limit;
          const confidence = evidenceConfidence;

          if (persistence < COMPLIANCE_TOLERANCES.SPEED_PERSISTENCE_LIMIT_SECONDS) {
            return {
              status: 'WARNING',
              evidence: `Speeding by +${excess.toFixed(1)} km/h for ${persistence.toFixed(1)} seconds.`,
              explanation: 'Potential traffic violation warning: Speed limit exceeded slightly. Slow down.',
              confidence: confidence * 0.8, // lower confidence for raw spikes
            };
          } else {
            return {
              status: 'VIOLATION',
              evidence: `Confirmed speeding by +${excess.toFixed(1)} km/h for ${persistence.toFixed(1)} seconds.`,
              explanation: 'Confirmed traffic violation: Speed is consistently above the legal speed limit.',
              confidence,
            };
          }
        }
      }

      case 'NO_ENTRY': {
        if (!roadContext.isNoEntry) {
          return {
            status: 'COMPLIANT',
            evidence: 'Road is open for entry.',
            explanation: 'No active entry restrictions on this segment.',
            confidence: 1.0,
          };
        }

        const proximity = roadContext.warningProximityMeters;
        if (proximity !== undefined && proximity > 0) {
          return {
            status: 'WARNING',
            evidence: `No-entry restriction ahead in ${proximity} meters.`,
            explanation: 'Proactive Alert: A restricted closed road is ahead. Prepare to turn.',
            confidence: evidenceConfidence * 0.9,
          };
        } else {
          return {
            status: 'VIOLATION',
            evidence: 'Vehicle entered a restricted closed road segment.',
            explanation: 'Potential traffic violation: Driving on a closed or prohibited entry road.',
            confidence: evidenceConfidence,
          };
        }
      }

      case 'ONE_WAY': {
        if (!roadContext.isOneWay) {
          return {
            status: 'COMPLIANT',
            evidence: 'Two-way road segment.',
            explanation: 'No one-way restrictions detected.',
            confidence: 1.0,
          };
        }

        // Simulating heading discrepancy
        const heading = vehicleContext.heading;
        if (heading > 180 && heading < 270) {
          return {
            status: 'VIOLATION',
            evidence: `Driving heading (${heading}°) opposes the legal traffic flow direction of the street.`,
            explanation: 'Potential traffic violation: Driving opposite to the legal direction on a one-way street.',
            confidence: evidenceConfidence * 0.9,
          };
        }
        return {
          status: 'COMPLIANT',
          evidence: `Driving heading (${heading}°) aligns with one-way direction.`,
          explanation: 'Driving direction is compliant.',
          confidence: evidenceConfidence,
        };
      }

      case 'NO_PARKING': {
        const isParked = driverBehavior.parkingStatus === 'parked';
        const detectsSign = signDetectionContext?.detectedSignId === 'no_parking';

        if (!isParked) {
          return {
            status: 'COMPLIANT',
            evidence: 'Vehicle is currently moving.',
            explanation: 'Parking rule evaluation skipped while driving.',
            confidence: 1.0,
          };
        }

        if (detectsSign) {
          const signConfidence = signDetectionContext?.detectionConfidence ?? 1.0;
          const status = signConfidence < COMPLIANCE_TOLERANCES.CONFIDENCE_THRESHOLD ? 'WARNING' : 'VIOLATION';
          return {
            status,
            evidence: `Vehicle parked near No Parking sign. Sign detection confidence: ${signConfidence}.`,
            explanation: status === 'WARNING' 
              ? 'Potential traffic violation: Parking in restricted area. Check local signage.' 
              : 'Potential traffic violation: Parking in a clearly marked No Parking zone.',
            confidence: evidenceConfidence * signConfidence,
          };
        }

        return {
          status: 'COMPLIANT',
          evidence: 'No active parking rules violated.',
          explanation: 'Parking is legal in this sector.',
          confidence: 0.9,
        };
      }

      case 'VEHICLE_RESTRICTION': {
        const restricts = roadContext.restrictedVehicleTypes || [];
        const isRestricted = restricts.includes(vehicleContext.vehicleType);

        if (isRestricted) {
          const proximity = roadContext.warningProximityMeters;
          if (proximity !== undefined && proximity > 0) {
            return {
              status: 'WARNING',
              evidence: `Road restricts ${vehicleContext.vehicleType}. Zone ahead in ${proximity} meters.`,
              explanation: `Proactive Alert: Access zone ahead restricts ${vehicleContext.vehicleType} class.`,
              confidence: evidenceConfidence * 0.9,
            };
          } else {
            return {
              status: 'VIOLATION',
              evidence: `Road is closed to vehicle category: ${vehicleContext.vehicleType}.`,
              explanation: 'Potential traffic violation: Driving an unauthorized vehicle class on this road.',
              confidence: evidenceConfidence,
            };
          }
        }

        return {
          status: 'COMPLIANT',
          evidence: `Vehicle category ${vehicleContext.vehicleType} is permitted.`,
          explanation: 'Vehicle type complies with local usage rules.',
          confidence: 1.0,
        };
      }

      case 'TIME_RESTRICTION': {
        const hours = roadContext.timeRestrictions || [];
        if (hours.length === 0) {
          return {
            status: 'COMPLIANT',
            evidence: 'No active temporal restrictions.',
            explanation: 'Road has open access schedules.',
            confidence: 1.0,
          };
        }

        const currentHour = context.environmentalContext?.currentHour ?? new Date().getHours();
        const activeBlock = hours.find((h) => currentHour >= h.startHour && currentHour <= h.endHour);

        if (activeBlock) {
          return {
            status: 'VIOLATION',
            evidence: `Current hour (${currentHour}:00) falls in restricted window (${activeBlock.startHour}:00-${activeBlock.endHour}:00).`,
            explanation: 'Potential traffic violation: Entering restricted segment during closed hours.',
            confidence: evidenceConfidence,
          };
        }

        return {
          status: 'COMPLIANT',
          evidence: `Current hour (${currentHour}:00) is outside restricted windows.`,
          explanation: 'Segment complies with local schedule windows.',
          confidence: 1.0,
        };
      }

      default:
        return {
          status: 'UNKNOWN',
          evidence: `Rule category ${rule.category} evaluation not fully implemented in local database.`,
          explanation: 'Evaluator fell back to unknown state due to missing sensor indicators.',
          confidence: 0.5,
        };
    }
  }
}
export default RuleEvaluator;
