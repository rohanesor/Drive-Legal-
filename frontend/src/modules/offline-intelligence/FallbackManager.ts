export class FallbackManager {
  private fallbackChains: Map<string, string[]> = new Map();

  registerChain(capabilityId: string, chain: string[]): void {
    this.fallbackChains.set(capabilityId, chain);
  }

  resolveFallback(capabilityId: string, currentOffline: boolean): string {
    const chain = this.fallbackChains.get(capabilityId);
    if (!chain || chain.length === 0) return capabilityId;

    if (currentOffline) {
      return chain[chain.length - 1];
    }
    return chain[0];
  }
}
export default FallbackManager;
