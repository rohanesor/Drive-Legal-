import { Checkpoint } from './types';
import * as crypto from 'crypto';

export class CheckpointManager {
  private chain: Checkpoint[] = [];
  private maxChainSize = 3;

  calculateChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  saveCheckpoint(stateVersion: string, data: any): Checkpoint {
    const rawChecksum = this.calculateChecksum(data);
    const checkpoint: Checkpoint = {
      checkpointId: `chk_${Date.now()}`,
      schemaVersion: '1.0',
      createdAt: Date.now(),
      runtimeVersion: '1.0.0',
      stateVersion,
      checksum: rawChecksum,
      data,
    };

    this.chain.unshift(checkpoint);
    if (this.chain.length > this.maxChainSize) {
      this.chain.pop();
    }
    return checkpoint;
  }

  loadValidCheckpoint(): Checkpoint | null {
    for (const chk of this.chain) {
      const actualChecksum = this.calculateChecksum(chk.data);
      if (chk.checksum === actualChecksum) {
        return chk;
      }
      console.warn(`[CheckpointManager] Checkpoint ${chk.checkpointId} corrupted. Falling back...`);
    }
    return null;
  }

  getChain(): Checkpoint[] {
    return this.chain;
  }

  reset(): void {
    this.chain = [];
  }
}
export default CheckpointManager;
