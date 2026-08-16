import { DriveScoreSnapshot, ScoreTrend } from './types';

export class ScoreHistory {
  private snapshots: DriveScoreSnapshot[] = [];

  addSnapshot(snapshot: DriveScoreSnapshot): void {
    this.snapshots.push(snapshot);
    // Keep last 100 entries to prevent memory leak
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }
  }

  getSnapshots(): DriveScoreSnapshot[] {
    return this.snapshots;
  }

  clear(): void {
    this.snapshots = [];
  }

  /**
   * Evaluates the score trend comparing recent snapshots with historical values.
   */
  calculateTrend(): ScoreTrend {
    if (this.snapshots.length < 3) {
      return 'UNKNOWN';
    }

    const mid = Math.floor(this.snapshots.length / 2);
    const recentList = this.snapshots.slice(mid);
    const olderList = this.snapshots.slice(0, mid);

    const avgRecent = recentList.reduce((acc, s) => acc + s.score, 0) / recentList.length;
    const avgOlder = olderList.reduce((acc, s) => acc + s.score, 0) / olderList.length;

    const diff = avgRecent - avgOlder;
    if (diff > 2.0) {
      return 'IMPROVING';
    } else if (diff < -2.0) {
      return 'DECLINING';
    }
    return 'STABLE';
  }

  /**
   * Aggregates trip snapshots into a final trip score.
   * Weighs the average score with the minimum/worst score recorded to prevent scoring gaming.
   */
  static calculateTripScore(history: DriveScoreSnapshot[]): number {
    if (history.length === 0) {
      return 100; // Base score for clean/empty trips
    }

    const average = history.reduce((acc, s) => acc + s.score, 0) / history.length;
    const minScore = Math.min(...history.map((s) => s.score));

    // Anti-gaming: final trip score accounts for the worst driving spikes
    const finalTripScore = Math.round((average * 0.7) + (minScore * 0.3));
    return Math.max(0, Math.min(100, finalTripScore));
  }
}
export default ScoreHistory;
