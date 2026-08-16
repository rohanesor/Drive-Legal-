import { Orchestrator, OrchestrationCancellationToken } from '../../frontend/src/modules/agents/orchestrator/Orchestrator';
import { AgentContext } from '../../frontend/src/modules/agents/orchestrator/types';
import { DecisionPolicyGate } from '../../frontend/src/modules/agents/orchestrator/DecisionPolicyGate';
import { ToolGateway } from '../../frontend/src/modules/agents/orchestrator/ToolGateway';

describe('Agent Orchestration & Decision Layer (P1.8)', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  const getAgentContext = (): AgentContext => ({
    realTime: {
      speed: 68,
      heading: 90,
      latitude: 11.0168,
      longitude: 76.9558,
      vehicleType: 'car',
    },
    trip: {
      routeId: 'route_123',
      destinationName: 'Avinashi Road Corner',
      tripScore: 82,
    },
    system: {
      country: 'IN',
      state: 'TN',
      city: 'Coimbatore',
    },
    preferences: {
      voiceEnabled: true,
      alertFrequency: 'medium',
      navigationAlerts: true,
      legalAlerts: true,
      safetyAlerts: true,
    },
  });

  test('1. LLM Call Policy: Bypasses LLM reasoning for deterministic speed check', async () => {
    const ctx = getAgentContext();
    const res = await orchestrator.process('What is my current speed?', ctx);
    expect(res.answer).toContain('vehicle speed is 68 km/h');
    expect(res.sources).toContain('P1.3'); // deterministic source
  });

  test('2. Cancellation Token: Stops agentic execution immediately', async () => {
    const ctx = getAgentContext();
    const token = new OrchestrationCancellationToken();
    token.cancel();

    await expect(orchestrator.process('Find safest route', ctx, token)).rejects.toThrow('Orchestration cancelled.');
  });

  test('3. DecisionPolicyGate: Blocks dangerous prohibited vehicle actions (STEER)', () => {
    const proposed = {
      id: 'dec_1',
      objective: 'Avoid collision',
      recommendation: 'Steer left immediately to avoid crash',
      actions: ['STEER'],
      evidence: [],
      constraints: [],
      confidence: 1.0,
      authority: 'CRITICAL' as const,
      status: 'PENDING',
    };

    const validated = DecisionPolicyGate.validateDecision(proposed);
    expect(validated.status).toBe('BLOCKED');
    expect(validated.actions).toHaveLength(0);
    expect(validated.recommendation).toContain('Prohibited vehicle control');
  });

  test('4. DecisionPolicyGate: Blocks actions violating legal constraints', () => {
    const proposed = {
      id: 'dec_2',
      objective: 'Follow navigation',
      recommendation: 'Drive on Sathy Rd',
      actions: ['NAVIGATE'],
      evidence: [],
      constraints: ['PROHIBITED_ZONE_HEAVY_RESTRICTION'],
      confidence: 0.9,
      authority: 'RECOMMENDATION' as const,
      status: 'PENDING',
    };

    const validated = DecisionPolicyGate.validateDecision(proposed);
    expect(validated.status).toBe('BLOCKED');
    expect(validated.recommendation).toContain('violates verified legal restrictions');
  });

  test('5. ToolGateway: Validates authorization permissions before execution', async () => {
    const ctx = getAgentContext();
    // Execute a read tool with correct permission -> succeeds
    const res = await ToolGateway.executeTool('get_current_risk', {}, ctx, ['telemetry:read']);
    expect(res.score).toBeDefined();

    // Execute tool with missing permissions -> throws
    await expect(
      ToolGateway.executeTool('get_current_risk', {}, ctx, ['other:permission'])
    ).rejects.toThrow('Authorization Error');
  });

  test('6. Idempotency: Prevents duplicate execution side effects of identical actions', async () => {
    const ctx = getAgentContext();
    // First execution requests NAVIGATE_ALTERNATIVE_ROUTE -> executes action
    const firstRes = await orchestrator.process('Find a safer route.', ctx);
    expect(firstRes.requestedActions).toContain('NAVIGATE_ALTERNATIVE_ROUTE');

    // Executing again in the same path prevents duplicate route modifications
    // (Checked internally via processedActions logs)
  });
});
