import { 
  AgentContext, AgentResult, AgentIntent, AgentType, 
  AgentPlan, Decision, Evidence 
} from './types';
import { IntentRouter } from './IntentRouter';
import { AgentRouter } from './AgentRouter';
import { PolicyGuard } from './PolicyGuard';
import { ActionExecutor } from './ActionExecutor';
import { SafetyAgent } from '../safety/SafetyAgent';
import { LegalAgent } from '../legal/LegalAgent';
import { RouteAgent } from '../route/RouteAgent';
import { VehicleAgent } from '../vehicle/VehicleAgent';
import { DriverAgent } from '../driver/DriverAgent';
import { ScoreAgent } from '../score/ScoreAgent';
import { DecisionPolicyGate } from './DecisionPolicyGate';

export class OrchestrationCancellationToken {
  private cancelled = false;
  cancel() {
    this.cancelled = true;
  }
  isCancelled() {
    return this.cancelled;
  }
}

export class Orchestrator {
  private fallbackMode: 'FULL_AI' | 'HYBRID' | 'DETERMINISTIC' = 'HYBRID';
  private processedActions: Set<string> = new Set();

  constructor(mode: 'FULL_AI' | 'HYBRID' | 'DETERMINISTIC' = 'HYBRID') {
    this.fallbackMode = mode;
  }

  setFallbackMode(mode: 'FULL_AI' | 'HYBRID' | 'DETERMINISTIC'): void {
    this.fallbackMode = mode;
  }

  /**
   * Main entry pipeline processing a driver query context and routing it to the compliance agent.
   */
  async process(
    request: string, 
    context: AgentContext, 
    cancellationToken?: OrchestrationCancellationToken
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}`;
    console.log(`[Orchestrator] agent_request_received request=${request}`);

    if (cancellationToken?.isCancelled()) {
      throw new Error('Orchestration cancelled.');
    }

    const intent = IntentRouter.detectIntent(request);
    console.log(`[Orchestrator] intent_detected intent=${intent}`);

    if (intent === 'EMERGENCY') {
      console.log('[Orchestrator] action_requested type=CALL_EMERGENCY');
      return {
        answer: 'CRITICAL ALERT: Emergency conditions detected. Initiating emergency call protocol.',
        intent: 'EMERGENCY',
        sources: ['EMERGENCY'],
        confidence: 1.0,
        recommendations: ['Safe stop the vehicle.', 'Contact roadside help.'],
        requestedActions: ['CALL_EMERGENCY'],
      };
    }

    const isDeterministicQuery = 
      request.toLowerCase().includes('speed') || 
      request.toLowerCase().includes('limit') || 
      request.toLowerCase().includes('score') ||
      request.toLowerCase().includes('battery') ||
      request.toLowerCase().includes('alert');

    if (isDeterministicQuery && this.fallbackMode === 'HYBRID') {
      console.log('[Orchestrator] LLM Call Policy: Bypassing LLM for deterministic query.');
      if (request.toLowerCase().includes('speed')) {
        const speed = context.realTime.speed;
        return {
          answer: `Your current vehicle speed is ${speed} km/h.`,
          intent: 'CURRENT_STATUS',
          sources: ['P1.3'],
          confidence: 1.0,
          recommendations: [],
          requestedActions: [],
        };
      }
    }

    if (this.fallbackMode === 'DETERMINISTIC') {
      console.log('[Orchestrator] Offline deterministic fallback active.');
      return {
        answer: 'DriveLegal Offline Assistant: Driving signals are normal. System is operating in offline mode.',
        intent,
        sources: [],
        confidence: 0.8,
        recommendations: ['Continue driving safely.'],
        requestedActions: [],
      };
    }

    const agentType = AgentRouter.selectAgent(intent);
    console.log(`[Orchestrator] agent_selected type=${agentType}`);

    const plan: AgentPlan = {
      id: `plan_${Date.now()}`,
      objective: `Resolve request: ${request}`,
      steps: [
        {
          id: 'step_1',
          agent: agentType,
          objective: 'Process user intent using specific tools',
          input: { request },
          dependencies: [],
          tools: agentType === 'RouteAgent' ? ['calculate_safe_route'] : ['get_current_risk'],
          status: 'PENDING',
        }
      ],
      requiredContext: ['realTime', 'trip'],
      agents: [agentType],
      tools: agentType === 'RouteAgent' ? ['calculate_safe_route'] : ['get_current_risk'],
      constraints: agentType === 'RouteAgent' ? ['LEGAL_COMPLIANT', 'SAFETY_CHECK'] : ['SAFETY_CHECK'],
      createdAt: Date.now(),
    };

    const step = plan.steps[0];
    step.status = 'RUNNING';
    
    let rawResult: AgentResult;
    try {
      const executionPromise = this.executeAgent(agentType, request, context, intent);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Agent execution timeout')), 5000)
      );

      rawResult = await Promise.race([executionPromise, timeoutPromise]);
      step.status = 'COMPLETED';
      step.output = rawResult;
    } catch (e) {
      console.error(`[Orchestrator] Step execution failed:`, e);
      step.status = 'FAILED';
      rawResult = {
        answer: 'I cannot verify this request at this moment due to a connection timeout.',
        intent,
        sources: [],
        confidence: 0.5,
        recommendations: ['Check system logs and try again.'],
        requestedActions: [],
      };
    }

    const evidence: Evidence[] = rawResult.sources.map((src) => ({
      source: src,
      value: rawResult.answer,
      timestamp: Date.now(),
      confidence: rawResult.confidence,
    }));

    let actionsToExecute = rawResult.requestedActions;
    let decisionRecommendation = rawResult.answer;

    const hasUnsafeRisk = context.realTime.speed > 100;
    const hasLegalRestriction = request.toLowerCase().includes('restricted') || request.toLowerCase().includes('prohibited');

    const constraints: string[] = [];
    if (hasUnsafeRisk) constraints.push('HIGH_RISK_SPEED');
    if (hasLegalRestriction) constraints.push('PROHIBITED_ZONE');

    const proposedDecision: Decision = {
      id: `dec_${Date.now()}`,
      objective: plan.objective,
      recommendation: decisionRecommendation,
      actions: actionsToExecute,
      evidence,
      constraints,
      confidence: rawResult.confidence,
      authority: hasUnsafeRisk ? 'CRITICAL' : 'RECOMMENDATION',
      status: 'PENDING',
    };

    const validatedDecision = DecisionPolicyGate.validateDecision(proposedDecision);
    decisionRecommendation = validatedDecision.recommendation;
    actionsToExecute = validatedDecision.actions;

    const sanitizedResult: AgentResult = {
      ...rawResult,
      answer: decisionRecommendation,
      requestedActions: actionsToExecute,
    };
    const sanitized = PolicyGuard.sanitizeResult(sanitizedResult);

    if (sanitized.requestedActions.length > 0) {
      for (const action of sanitized.requestedActions) {
        const idempotencyKey = `${requestId}_${action}`;
        if (this.processedActions.has(idempotencyKey)) {
          console.log(`[Orchestrator] Idempotency: Action ${action} already executed. Skipping duplicate.`);
          continue;
        }
        
        console.log(`[Orchestrator] action_requested type=${action}`);
        try {
          await ActionExecutor.executeAction(action);
          this.processedActions.add(idempotencyKey);
          console.log(`[Orchestrator] action_executed type=${action}`);
        } catch (actionErr) {
          console.error(`[Orchestrator] action execution failed for ${action}:`, actionErr);
        }
      }
    }

    const latency = Date.now() - startTime;
    console.log(`[Orchestrator] request_completed latencyMs=${latency}`);

    return sanitized;
  }

  private async executeAgent(
    agentType: AgentType, 
    request: string, 
    context: AgentContext, 
    intent: AgentIntent
  ): Promise<AgentResult> {
    if (agentType === 'LegalAgent') {
      return await LegalAgent.processQuery(request, context, intent);
    } else if (agentType === 'RouteAgent') {
      return await RouteAgent.processQuery(request, context, intent);
    } else if (agentType === 'VehicleAgent') {
      return await VehicleAgent.processQuery(request, context, intent);
    } else if (agentType === 'ScoreAgent') {
      return await ScoreAgent.processQuery(request, context, intent);
    } else if (agentType === 'DriverAgent') {
      return await DriverAgent.processQuery(request, context, intent);
    } else {
      return await SafetyAgent.processQuery(request, context, intent);
    }
  }
}
export default Orchestrator;
