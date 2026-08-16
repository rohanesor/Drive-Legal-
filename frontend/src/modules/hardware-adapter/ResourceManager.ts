export class ResourceManager {
  private activeResources: Map<string, string> = new Map();

  acquireResource(resourceName: string, adapterId: string): boolean {
    if (this.activeResources.has(resourceName)) {
      const currentOwner = this.activeResources.get(resourceName);
      if (currentOwner !== adapterId) {
        console.warn(`[ResourceManager] Resource collision on: ${resourceName}. Locked by: ${currentOwner}`);
        return false;
      }
    }
    this.activeResources.set(resourceName, adapterId);
    return true;
  }

  releaseResource(resourceName: string, adapterId: string): void {
    if (this.activeResources.get(resourceName) === adapterId) {
      this.activeResources.delete(resourceName);
    }
  }

  getOwner(resourceName: string): string | undefined {
    return this.activeResources.get(resourceName);
  }
}
export default ResourceManager;
