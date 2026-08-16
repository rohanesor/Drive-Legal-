import { SecurityManager } from '../../frontend/src/modules/offline-security/SecurityManager';
import { SecureStorageManager } from '../../frontend/src/modules/offline-security/SecureStorageManager';
import { KeyManager } from '../../frontend/src/modules/offline-security/KeyManager';

describe('Offline Security, Integrity & Trust Layer (P2.15)', () => {
  let manager: SecurityManager;

  beforeEach(() => {
    manager = new SecurityManager();
  });

  test('1. SecureStorageManager encrypts and decrypts values utilizing AES-GCM', () => {
    const store = manager.getSecureStorage();
    const secretMessage = 'Secret Driver Profile Data';

    store.encryptAndStore('profile_1', secretMessage);

    // Retrieve and verify decryption match
    const decrypted = store.decryptAndRetrieve('profile_1');
    expect(decrypted).toBe(secretMessage);
  });

  test('2. KeyManager maintains logical separation between domains', () => {
    const km = new KeyManager();
    const driverKey = km.getKey('driver');
    const signatureKey = km.getKey('signature');

    expect(driverKey).toBeDefined();
    expect(signatureKey).toBeDefined();
    expect(driverKey).not.toEqual(signatureKey); // unique key separation
  });

  test('3. SignatureManager validates publisher trust and revocation lists', () => {
    const sm = manager.getSignatureManager();

    // Whitelisted signature
    expect(sm.verifyPublisherSignature('sig_google-key', 'google-key')).toBe(true);

    // Untrusted publisher
    expect(sm.verifyPublisherSignature('sig_untrusted', 'untrusted')).toBe(false);

    // Revocation list verification
    sm.revokePublisher('google-key');
    expect(sm.verifyPublisherSignature('sig_google-key', 'google-key')).toBe(false);
  });

  test('4. IntegrityManager compiles chained audits and detects tampering', () => {
    const integrity = manager.getIntegrityManager();

    integrity.appendAuditRecord({ event: 'START_DRIVING' });
    integrity.appendAuditRecord({ event: 'SPEED_LIMIT_CHANGE' });

    expect(integrity.verifyAuditChain()).toBe('VALID');

    // Tamper audit record: Modify message of index 1
    const chain = integrity.getAuditChain();
    chain[1].eventData = { event: 'TAMPERED_EVENT' };

    expect(integrity.verifyAuditChain()).toBe('BROKEN');
  });

  test('5. SecurityManager blocks version rollback attacks', () => {
    // Valid update version >= 2.0.0
    expect(manager.validateVersionRollback('2.5.0')).toBe(true);

    // Insecure rollback update < 2.0.0
    expect(manager.validateVersionRollback('1.9.0')).toBe(false);
    expect(manager.getSecurityHealth().overallStatus).toBe('COMPROMISED');
  });

  test('6. SecurityManager clamps configuration thresholds within safety boundaries', () => {
    // Attempting to set min warning distance below safe limit (e.g. 10m)
    manager.updateSafetyConfiguration({ minWarningDistanceMeters: 10 });

    // Clamps to minimum safety bound (50m)
    expect(manager.getSafetyConfiguration().minWarningDistanceMeters).toBe(50);
  });

  test('7. SecurityManager rejects voice requests to disable critical warnings', () => {
    const voiceRes = manager.processVoiceCommand('Disable all warnings immediately.');
    expect(voiceRes.success).toBe(false);
    expect(voiceRes.message).toContain('REJECTED');
  });
});
