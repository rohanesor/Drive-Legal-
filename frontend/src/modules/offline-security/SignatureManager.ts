import { TrustStatus } from './types';

export class SignatureManager {
  private trustedPublishers: Set<string> = new Set();
  private revokedPublishers: Set<string> = new Set();

  constructor() {
    this.trustedPublishers.add('google-key');
  }

  registerPublisher(publisherId: string): void {
    if (this.revokedPublishers.has(publisherId)) return;
    this.trustedPublishers.add(publisherId);
  }

  revokePublisher(publisherId: string): void {
    this.trustedPublishers.delete(publisherId);
    this.revokedPublishers.add(publisherId);
  }

  verifyPublisherSignature(signature: string, publisherId: string): boolean {
    if (this.revokedPublishers.has(publisherId)) {
      return false;
    }
    if (!this.trustedPublishers.has(publisherId)) {
      return false;
    }
    return signature === `sig_${publisherId}`;
  }
}
export default SignatureManager;
