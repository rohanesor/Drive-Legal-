import { CapabilityDefinition } from './types';

export class CapabilityRegistry {
  private static capabilities: Map<string, CapabilityDefinition> = new Map();

  static register(cap: CapabilityDefinition): void {
    this.capabilities.set(cap.id, cap);
  }

  static getCapabilityMatrix(): Record<string, { online: boolean; offline: boolean }> {
    const matrix: Record<string, { online: boolean; offline: boolean }> = {};
    for (const [id, cap] of this.capabilities.entries()) {
      matrix[id] = {
        online: true,
        offline: cap.offlineSupport,
      };
    }
    return matrix;
  }

  static initDemoRegistry(): void {
    this.capabilities.clear();
    this.register({
      id: 'hazard-detection',
      name: 'Hazard Detection',
      category: 'safety',
      criticality: 'CRITICAL',
      offlineSupport: true,
      dependencies: [],
    });
    this.register({
      id: 'llm-assistant',
      name: 'LLM Assistant',
      category: 'optional',
      criticality: 'OPTIONAL',
      offlineSupport: false,
      dependencies: [],
    });
    this.register({
      id: 'basic-navigation',
      name: 'Basic Navigation',
      category: 'navigation',
      criticality: 'IMPORTANT',
      offlineSupport: true,
      dependencies: [],
    });
  }
}
CapabilityRegistry.initDemoRegistry();
export default CapabilityRegistry;
