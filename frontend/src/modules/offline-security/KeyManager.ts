import * as crypto from 'crypto';

export class KeyManager {
  private keyStore: Map<string, Buffer> = new Map();

  constructor() {
    this.keyStore.set('driver_key', crypto.randomBytes(32));
    this.keyStore.set('signature_key', crypto.randomBytes(32));
    this.keyStore.set('audit_key', crypto.randomBytes(32));
  }

  getKey(domain: 'driver' | 'signature' | 'audit'): Buffer | undefined {
    return this.keyStore.get(`${domain}_key`);
  }

  rotateKey(domain: 'driver' | 'signature' | 'audit'): void {
    this.keyStore.set(`${domain}_key`, crypto.randomBytes(32));
  }
}
export default KeyManager;
