import { ReleaseReadinessReport, ReleaseState } from './types';

export class ReleaseGate {
  private state: ReleaseState = 'NOT_READY';

  setReleaseState(state: ReleaseState): void {
    this.state = state;
  }

  getReleaseState(): ReleaseState {
    return this.state;
  }

  evaluateReleaseGate(report: ReleaseReadinessReport): ReleaseState {
    if (
      report.build === 'FAIL' ||
      report.tests === 'FAIL' ||
      report.security === 'FAIL' ||
      report.offline === 'FAIL' ||
      report.datasets === 'FAIL' ||
      report.database === 'FAIL' ||
      report.status === 'FAIL'
    ) {
      this.state = 'NOT_READY';
      console.error('[ReleaseGate] Critical release checks failed. Release blocked.');
      return 'NOT_READY';
    }

    this.state = 'RELEASE_CANDIDATE';
    console.log('[ReleaseGate] All release checks passed. State transitioned to RELEASE_CANDIDATE.');
    return 'RELEASE_CANDIDATE';
  }
}
export default ReleaseGate;
