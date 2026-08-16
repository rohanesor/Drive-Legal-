import * as crypto from 'crypto';

export class SecureStorageManager {
  private vault: Map<string, string> = new Map();
  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = crypto.randomBytes(32);
  }

  encryptAndStore(key: string, plaintext: string): void {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const payload = `${iv.toString('hex')}:${encrypted}:${authTag}`;
    this.vault.set(key, payload);
  }

  decryptAndRetrieve(key: string): string | null {
    const payload = this.vault.get(key);
    if (!payload) return null;

    const [ivHex, encryptedHex, authTagHex] = payload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted1 = decipher.update(encrypted);
    const decrypted2 = decipher.final();

    return Buffer.concat([decrypted1, decrypted2]).toString('utf8');
  }

  delete(key: string): void {
    this.vault.delete(key);
  }
}
export default SecureStorageManager;
