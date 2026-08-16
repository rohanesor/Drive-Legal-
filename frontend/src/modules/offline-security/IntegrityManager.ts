import { AuditRecord } from './types';
import * as crypto from 'crypto';

export class IntegrityManager {
  private auditChain: AuditRecord[] = [];

  calculateSHA256(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  appendAuditRecord(eventData: any): void {
    const nextIndex = this.auditChain.length;
    const previousHash = nextIndex > 0 ? this.auditChain[nextIndex - 1].hash : 'root_hash';
    const recordPayload = {
      index: nextIndex,
      timestamp: Date.now(),
      eventData,
    };

    const combinedPayload = JSON.stringify(recordPayload) + previousHash;
    const hash = crypto.createHash('sha256').update(combinedPayload).digest('hex');

    this.auditChain.push({
      ...recordPayload,
      hash,
    });
  }

  getAuditChain(): AuditRecord[] {
    return this.auditChain;
  }

  verifyAuditChain(): 'VALID' | 'BROKEN' | 'UNKNOWN' {
    if (this.auditChain.length === 0) return 'UNKNOWN';

    for (let i = 0; i < this.auditChain.length; i++) {
      const record = this.auditChain[i];
      const previousHash = i > 0 ? this.auditChain[i - 1].hash : 'root_hash';
      const recordPayload = {
        index: record.index,
        timestamp: record.timestamp,
        eventData: record.eventData,
      };

      const combinedPayload = JSON.stringify(recordPayload) + previousHash;
      const expectedHash = crypto.createHash('sha256').update(combinedPayload).digest('hex');

      if (record.hash !== expectedHash) {
        return 'BROKEN';
      }
    }

    return 'VALID';
  }
}
export default IntegrityManager;
