import { AgentIntent, AgentType } from './types';

export class AgentRouter {
  /**
   * Maps AgentIntent to specific Agent handler categories.
   */
  static selectAgent(intent: AgentIntent): AgentType {
    switch (intent) {
      case 'SAFETY_QUERY':
      case 'SAFETY_EVENT':
      case 'ALERT_EVENT':
        return 'SafetyAgent';
      case 'SCORE_QUERY':
        return 'ScoreAgent';
      case 'LEGAL_QUERY':
      case 'LEGAL_EVENT':
        return 'LegalAgent';
      case 'ROUTE_QUERY':
      case 'NAVIGATION_REQUEST':
      case 'NAVIGATION_EVENT':
        return 'RouteAgent';
      case 'VEHICLE_EVENT':
        return 'VehicleAgent';
      case 'USER_REQUEST':
      case 'GENERAL_QUERY':
      case 'CURRENT_STATUS':
      default:
        return 'DriverAgent';
    }
  }
}
export default AgentRouter;
