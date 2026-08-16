export class RecoveryManager {
  private journal: string[] = [];

  recordJournal(step: string): void {
    this.journal.push(step);
  }

  getJournal(): string[] {
    return this.journal;
  }

  clearJournal(): void {
    this.journal = [];
  }

  async retryAction<T>(action: () => Promise<T>, maxRetries = 3, baseDelayMs = 10): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (err) {
        lastError = err;
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[RecoveryManager] Action failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
}
export default RecoveryManager;
