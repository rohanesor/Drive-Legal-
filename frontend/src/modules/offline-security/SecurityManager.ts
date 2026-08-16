import { SafetyBounds, SecurityHealth, SecurityState, SecurityEvent } from './types';
import { SecureStorageManager } from './SecureStorageManager';
import { SignatureManager } from './SignatureManager';
import { IntegrityManager } from './IntegrityManager';

export class SecurityManager {
  private secureStorage = new SecureStorageManager();
  private signatureManager = new SignatureManager();
  private integrityManager = new IntegrityManager();

  private activeSafetyConfig: SafetyBounds = {
    minWarningDistanceMeters: 100,
    maxAlertCooldownSeconds: 15,
    maxRouteDeviationThresholdMeters: 50,
  };

  private minimumAllowedVersion = '2.0.0';
  private securityEvents: SecurityEvent[] = [];

  updateSafetyConfiguration(config: Partial<SafetyBounds>): void {
    const updated = { ...this.activeSafetyConfig, ...config };

    if (updated.minWarningDistanceMeters < 50) {
      this.recordSecurityEvent('CONFIGURATION_TAMPERING', 'HIGH', { detail: 'Min warning distance below safe bound.' });
      updated.minWarningDistanceMeters = 50;
    }
    if (updated.maxAlertCooldownSeconds > 60) {
      this.recordSecurityEvent('CONFIGURATION_TAMPERING', 'HIGH', { detail: 'Max alert cooldown exceeds safe limit.' });
      updated.maxAlertCooldownSeconds = 60;
    }
    if (updated.maxRouteDeviationThresholdMeters > 100) {
      this.recordSecurityEvent('CONFIGURATION_TAMPERING', 'HIGH', { detail: 'Max deviation threshold exceeds safe limit.' });
      updated.maxRouteDeviationThresholdMeters = 100;
    }

    this.activeSafetyConfig = updated;
  }

  getSafetyConfiguration(): SafetyBounds {
    return this.activeSafetyConfig;
  }

  validateVersionRollback(incomingVersion: string): boolean {
    const minVal = parseFloat(this.minimumAllowedVersion);
    const incVal = parseFloat(incomingVersion);

    if (incVal < minVal) {
      this.recordSecurityEvent('VERSION_ROLLBACK_ATTEMPT', 'CRITICAL', {
        incoming: incomingVersion,
        minAllowed: this.minimumAllowedVersion,
      });
      return false;
    }
    return true;
  }

  processVoiceCommand(command: string): { success: boolean; message: string } {
    const cmd = command.toLowerCase();
    if (
      cmd.includes('disable warnings') ||
      (cmd.includes('disable') && cmd.includes('warning')) ||
      cmd.includes('mute safety') ||
      cmd.includes('disable critical')
    ) {
      this.recordSecurityEvent('TRUST_FAILURE', 'WARNING', { command });
      return { success: false, message: 'Command REJECTED: Voice commands cannot bypass safety warning policies.' };
    }
    return { success: true, message: 'Command accepted.' };
  }

  getSecurityHealth(): SecurityHealth {
    const hasFailures = this.securityEvents.some((e) => e.severity === 'CRITICAL');
    const hasWarnings = this.securityEvents.some((e) => e.severity === 'HIGH' || e.severity === 'WARNING');

    let overallStatus: SecurityState = 'SECURE';
    if (hasFailures) {
      overallStatus = 'COMPROMISED';
    } else if (hasWarnings) {
      overallStatus = 'WARNING';
    }

    return {
      secureStorage: true,
      datasetIntegrity: true,
      configurationIntegrity: true,
      auditIntegrity: this.integrityManager.verifyAuditChain() !== 'BROKEN',
      trustRegistry: true,
      keyStatus: true,
      overallStatus,
    };
  }

  recordSecurityEvent(type: SecurityEvent['type'], severity: SecurityEvent['severity'], metadata: any): void {
    const event: SecurityEvent = {
      eventId: `sec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      severity,
      timestamp: Date.now(),
      metadata,
    };
    this.securityEvents.push(event);
    this.integrityManager.appendAuditRecord(event);
  }

  getSecurityEvents(): SecurityEvent[] {
    return this.securityEvents;
  }

  getIntegrityManager(): IntegrityManager {
    return this.integrityManager;
  }

  getSecureStorage(): SecureStorageManager {
    return this.secureStorage;
  }

  getSignatureManager(): SignatureManager {
    return this.signatureManager;
  }

  resetSecurityState(): void {
    this.securityEvents = [];
    this.integrityManager = new IntegrityManager();
    this.secureStorage = new SecureStorageManager();
    this.signatureManager = new SignatureManager();
    this.activeSafetyConfig = {
      minWarningDistanceMeters: 100,
      maxAlertCooldownSeconds: 15,
      maxRouteDeviationThresholdMeters: 50,
    };
  }
}
export default SecurityManager;
