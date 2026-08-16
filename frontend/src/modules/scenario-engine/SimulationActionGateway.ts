export class SimulationActionGateway {
  private static isSimulating = true;

  static setSimulationMode(enabled: boolean): void {
    this.isSimulating = enabled;
  }

  static executeAction(actionType: string, payload: any, realActionCallback: () => any): any {
    if (this.isSimulating) {
      console.log(`[SimulationActionGateway] Simulation Mode Active. Blocked real execution of action: ${actionType}`);
      return { status: 'SIMULATED_SUCCESS', actionType, payload };
    }
    return realActionCallback();
  }
}
export default SimulationActionGateway;
