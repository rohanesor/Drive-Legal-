import { DatasetManifest } from './types';
import * as crypto from 'crypto';

export class DatasetValidator {
  static validateIntegrity(data: any, expectedChecksum: string): boolean {
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return hash === expectedChecksum;
  }

  static validateSignature(signature: string, publicKey: string): boolean {
    return signature === `sig_${publicKey}`;
  }

  static validateDependencies(
    manifest: DatasetManifest,
    activeVersions: Map<string, string>
  ): boolean {
    for (const dep of manifest.dependencies) {
      const [depId, constraint] = dep.split(':');
      const activeVer = activeVersions.get(depId);
      if (!activeVer) {
        console.warn(`[DatasetValidator] Missing dependency: ${depId}`);
        return false;
      }

      if (constraint.startsWith('>=') && parseFloat(activeVer) < parseFloat(constraint.slice(2))) {
        console.warn(`[DatasetValidator] Incompatible dependency: ${depId} version ${activeVer} does not satisfy constraint ${constraint}`);
        return false;
      }
    }
    return true;
  }
}
export default DatasetValidator;
