import { DecisionRecord, AuditCorrection } from './types';
import * as crypto from 'crypto';

export class DecisionAuditStore {
  private records: DecisionRecord[] = [];
  private corrections: AuditCorrection[] = [];

  static calculateHash(record: Omit<DecisionRecord, 'hash'>): string {
    const dataToHash = {
      decisionId: record.decisionId,
      timestamp: record.timestamp,
      tripId: record.tripId,
      correlationId: record.correlationId,
      decisionType: record.decisionType,
      parentHash: record.parentHash,
      selectedAction: record.selectedAction,
      outcome: record.outcome,
    };
    return crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
  }

  appendRecord(record: Omit<DecisionRecord, 'hash' | 'parentHash'>): void {
    const parentHash = this.records.length > 0 ? this.records[this.records.length - 1].hash : '0';
    
    const cleanInputs = {
      ...record.inputs,
      location: record.inputs.location 
        ? { 
            latitude: Math.round(record.inputs.location.latitude * 100) / 100, 
            longitude: Math.round(record.inputs.location.longitude * 100) / 100 
          }
        : undefined,
    };

    const finalRecord: DecisionRecord = {
      ...record,
      inputs: cleanInputs,
      parentHash,
      hash: '',
    };

    finalRecord.hash = DecisionAuditStore.calculateHash(finalRecord);
    this.records.push(finalRecord);
  }

  verifyIntegrity(): boolean {
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      const calculated = DecisionAuditStore.calculateHash(record);
      if (record.hash !== calculated) {
        return false;
      }
      if (i > 0) {
        const prev = this.records[i - 1];
        if (record.parentHash !== prev.hash) {
          return false;
        }
      }
    }
    return true;
  }

  addCorrection(correction: AuditCorrection): void {
    const record = this.records.find((r) => r.decisionId === correction.decisionId);
    if (!record) {
      throw new Error(`Cannot correct decision: Record ${correction.decisionId} not found.`);
    }
    this.corrections.push(correction);
  }

  getRecords(): DecisionRecord[] {
    return this.records;
  }

  getCorrections(): AuditCorrection[] {
    return this.corrections;
  }

  reset(): void {
    this.records = [];
    this.corrections = [];
  }
}
export default DecisionAuditStore;
