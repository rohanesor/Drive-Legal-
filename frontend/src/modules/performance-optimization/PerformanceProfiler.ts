import { PerformanceMetric } from './types';

export class PerformanceProfiler {
  private activeSpans: Map<string, { start: number; component: string; operation: string; correlationId: string }> = new Map();
  private metrics: PerformanceMetric[] = [];
  private profilingMode: 'OFF' | 'NORMAL' | 'DETAILED' | 'TEST' = 'NORMAL';

  setProfilingMode(mode: 'OFF' | 'NORMAL' | 'DETAILED' | 'TEST'): void {
    this.profilingMode = mode;
  }

  startSpan(spanId: string, component: string, operation: string, correlationId: string): void {
    if (this.profilingMode === 'OFF') return;
    this.activeSpans.set(spanId, {
      start: Date.now(),
      component,
      operation,
      correlationId,
    });
  }

  endSpan(spanId: string): PerformanceMetric | null {
    if (this.profilingMode === 'OFF') return null;
    const span = this.activeSpans.get(spanId);
    if (!span) return null;

    const duration = Date.now() - span.start;
    const metric: PerformanceMetric = {
      component: span.component,
      operation: span.operation,
      duration,
      timestamp: Date.now(),
      correlationId: span.correlationId,
    };

    this.metrics.push(metric);
    this.activeSpans.delete(spanId);
    return metric;
  }

  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.activeSpans.clear();
  }
}
export default PerformanceProfiler;
