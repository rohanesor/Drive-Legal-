import { RiskAssessment, RiskLevel, RiskFactor, RiskEngineConfig, RiskUncertainty } from './types';
import { DriveContext } from '../context-engine/types';
import { RiskScoreCalculator } from './RiskScoreCalculator';
import { RiskTrendEngine } from './RiskTrendEngine';
import { RiskExplanationEngine } from './RiskExplanationEngine';

export class RiskEngine {
  private config: RiskEngineConfig = {
    thresholds: { safe: 0.2, low: 0.4, moderate: 0.6, high: 0.8 },
    factorWeights: { SPEED: 1.5, ROAD: 1.0, WEATHER: 1.0, HAZARD: 2.0 },
    aggregationStrategy: 'WEIGHTED_SUM',
    hysteresis: 0.02,
  };

  private trendEngine = new RiskTrendEngine();
  private previousLevel: RiskLevel = 'SAFE';

  assess(ctx: DriveContext, speedLimit: number | null): RiskAssessment {
    const factors: RiskFactor[] = [];
    const missingInputs: string[] = [];

    if (speedLimit !== null && speedLimit > 0) {
      const speedDelta = ctx.location.speed - speedLimit;
      let score = 0.0;
      let explanation = 'Speed within safe limit';

      if (speedDelta > 30) {
        score = 0.9;
        explanation = 'Severe speed limit violation';
      } else if (speedDelta > 15) {
        score = 0.6;
        explanation = 'Moderate speed limit violation';
      } else if (speedDelta > 0) {
        score = 0.3;
        explanation = 'Minor speed limit violation';
      }

      factors.push({
        id: 'f_speed',
        type: 'SPEED',
        score,
        confidence: 0.95,
        severity: score > 0.6 ? 2 : 1,
        evidence: [`Speed: ${ctx.location.speed} km/h`, `Limit: ${speedLimit} km/h`],
        source: 'gps',
        timestamp: Date.now(),
        freshness: 'CURRENT',
        explanation,
      });
    } else {
      missingInputs.push('speedLimit');
    }

    let weatherScore = 0.0;
    if (ctx.environment.weather === 'RAIN' || ctx.environment.weather === 'FOG') {
      weatherScore = 0.5;
    } else if (ctx.environment.weather === 'STORM') {
      weatherScore = 0.8;
    }

    factors.push({
      id: 'f_weather',
      type: 'WEATHER',
      score: weatherScore,
      confidence: 0.9,
      severity: weatherScore > 0.5 ? 2 : 1,
      evidence: [`Weather: ${ctx.environment.weather}`],
      source: 'local-environment',
      timestamp: Date.now(),
      freshness: 'CURRENT',
      explanation: weatherScore > 0.0 ? 'Adverse weather conditions' : 'Clear weather conditions',
    });

    let roadScore = 0.0;
    if (ctx.road.roadClass === 'HIGHWAY') roadScore = 0.2;
    factors.push({
      id: 'f_road',
      type: 'ROAD',
      score: roadScore,
      confidence: 0.8,
      severity: 1,
      evidence: [`Road: ${ctx.road.roadName}`],
      source: 'map-matcher',
      timestamp: Date.now(),
      freshness: 'CURRENT',
      explanation: 'Highway transit risk',
    });

    const schoolZone = ctx.restrictions.some((r) => r.type === 'SPEED_LIMIT_30' && r.status === 'ACTIVE');
    const poorVisibility = ctx.environment.weather === 'FOG';

    const overallScore = RiskScoreCalculator.calculateOverallScore(
      factors,
      this.config,
      schoolZone,
      poorVisibility
    );

    this.trendEngine.addScore(overallScore);
    const trend = this.trendEngine.detectTrend();
    const riskLevel = this.trendEngine.classifyLevel(
      overallScore,
      this.previousLevel,
      this.config
    );
    this.previousLevel = riskLevel;

    let recommendedAction: 'INFO' | 'ADVISORY' | 'WARNING' | 'URGENT' = 'INFO';
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') recommendedAction = 'URGENT';
    else if (riskLevel === 'MODERATE') recommendedAction = 'WARNING';
    else if (riskLevel === 'LOW') recommendedAction = 'ADVISORY';

    const uncertainty: RiskUncertainty = {
      score: missingInputs.length > 0 ? 0.4 : 0.0,
      missingInputs,
      staleInputs: [],
      conflictingInputs: [],
      explanation: missingInputs.length > 0 ? 'Missing SpeedLimit parameters.' : 'All parameters clear.',
    };

    return {
      assessmentId: `risk_${Date.now()}`,
      timestamp: Date.now(),
      contextVersion: ctx.contextId,
      overallScore,
      riskLevel,
      factors,
      uncertainty,
      trend,
      recommendedAction,
      explanation: RiskExplanationEngine.generateExplanation(factors, riskLevel),
      confidence: 0.95,
      freshness: 'CURRENT',
      modelVersion: '1.0.0',
      configVersion: '1.0',
    };
  }

  updateConfig(config: Partial<RiskEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
export default RiskEngine;
