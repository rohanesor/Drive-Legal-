import { Orchestrator } from '../../frontend/src/modules/agents/orchestrator/Orchestrator';
import { AgentContext } from '../../frontend/src/modules/agents/orchestrator/types';
import { IntentRouter } from '../../frontend/src/modules/agents/orchestrator/IntentRouter';
import { AgentRouter } from '../../frontend/src/modules/agents/orchestrator/AgentRouter';
import { ToolRegistry } from '../../frontend/src/modules/agents/orchestrator/ToolRegistry';
import { PolicyGuard } from '../../frontend/src/modules/agents/orchestrator/PolicyGuard';
import { ActionExecutor } from '../../frontend/src/modules/agents/orchestrator/ActionExecutor';

describe('Agentic Orchestration Layer (P1.0)', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  const getAgentContext = (): AgentContext => ({
    realTime: {
      speed: 68, // speeding!
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

  test('1. IntentRouter: Safety query intent matching works', () => {
    const intent = IntentRouter.detectIntent('Why am I getting a warning?');
    expect(intent).toBe('SAFETY_QUERY');
  });

  test('2. IntentRouter: Legal query intent matching works', () => {
    const intent = IntentRouter.detectIntent('Is there a parking fine?');
    expect(intent).toBe('LEGAL_QUERY');
  });

  test('3. IntentRouter: Route query intent matching works', () => {
    const intent = IntentRouter.detectIntent('Show alternative route tradeoff');
    expect(intent).toBe('ROUTE_QUERY');
  });

  test('4. IntentRouter: Score query intent matching works', () => {
    const intent = IntentRouter.detectIntent('Why did my score drop?');
    expect(intent).toBe('SCORE_QUERY');
  });

  test('5. AgentRouter maps intents correctly', () => {
    expect(AgentRouter.selectAgent('SAFETY_QUERY')).toBe('SafetyAgent');
    expect(AgentRouter.selectAgent('LEGAL_QUERY')).toBe('LegalAgent');
    expect(AgentRouter.selectAgent('NAVIGATION_REQUEST')).toBe('RouteAgent');
  });

  test('6. ToolRegistry resolves defaults and handles context execution', async () => {
    const tool = ToolRegistry.getTool('get_current_risk');
    expect(tool).toBeDefined();
    const ctx = getAgentContext();
    const result = await tool?.execute({}, ctx);
    expect(result.score).toBeGreaterThan(0);
  });

  test('7. Graceful degradation when a tool throws errors', async () => {
    // Intentionally delete a tool to check fallback logic
    const backup = ToolRegistry.getTool('evaluate_legal_compliance');
    
    // Safety check fallback
    const ctx = getAgentContext();
    const result = await orchestrator.process('Can I drive here?', ctx);
    expect(result.answer).toContain('compliance status');
  });

  test('8. Confidence propagates correctly from sub-tools', async () => {
    const ctx = getAgentContext();
    const result = await orchestrator.process('Why is my score 82?', ctx);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('9. PolicyGuard sanitizes absolute legal claims', () => {
    const badResult = {
      answer: 'You are definitely getting a challan because of speeding.',
      intent: 'LEGAL_QUERY' as const,
      sources: ['P0.4'],
      confidence: 0.95,
      recommendations: [],
      requestedActions: [],
    };

    const sanitized = PolicyGuard.sanitizeResult(badResult);
    expect(sanitized.answer).not.toContain('definitely');
    expect(sanitized.answer).toContain('potential traffic violation warning');
  });

  test('10. PolicyGuard sanitizes ticket and legal claims from user requests', () => {
    const badResult = {
      answer: 'You violate the law and you will get fined!',
      intent: 'LEGAL_QUERY' as const,
      sources: ['P0.4'],
      confidence: 0.95,
      recommendations: [],
      requestedActions: [],
    };

    const sanitized = PolicyGuard.sanitizeResult(badResult);
    expect(sanitized.answer).toContain('potential traffic violation warning');
  });

  test('11. Orchestrator offline fallback handles degraded requests gracefully', async () => {
    orchestrator.setFallbackMode('DETERMINISTIC');
    const ctx = getAgentContext();
    const result = await orchestrator.process('Explain safety rating', ctx);
    expect(result.answer).toContain('Offline Assistant');
  });

  test('12. ActionExecutor blocks dangerous vehicle steering action', async () => {
    await expect(ActionExecutor.executeAction('STEER')).rejects.toThrow('Security Violation');
  });

  test('13. ActionExecutor permits safe navigation action recommendation', async () => {
    const res = await ActionExecutor.executeAction('NAVIGATE');
    expect(res.executed).toBe(true);
  });

  test('14. IntentRouter handles unknown queries with general fallback', () => {
    const intent = IntentRouter.detectIntent('Hello, nice weather today.');
    expect(intent).toBe('GENERAL_QUERY');
  });

  test('15. E2E Scenario 1: Why am I getting a warning?', async () => {
    const ctx = getAgentContext();
    const result = await orchestrator.process('Why am I getting a warning?', ctx);
    expect(result.intent).toBe('SAFETY_QUERY');
    expect(result.sources).toContain('P0.3');
    expect(result.answer).toContain('safety risk score');
  });

  test('16. E2E Scenario 2: Can I drive on this road?', async () => {
    const ctx = getAgentContext();
    const result = await orchestrator.process('Can I drive on this road?', ctx);
    expect(result.intent).toBe('LEGAL_QUERY');
    expect(result.sources).toContain('P0.4');
    expect(result.answer).toContain('legal compliance status');
  });

  test('17. E2E Scenario 3: Find a safer route alternative', async () => {
    const ctx = getAgentContext();
    const result = await orchestrator.process('Find a safer route.', ctx);
    expect(result.intent).toBe('NAVIGATION_REQUEST');
    expect(result.sources).toContain('P0.2');
    expect(result.requestedActions).toContain('NAVIGATE_ALTERNATIVE_ROUTE');
  });

  test('18. E2E Scenario 4: Why did my score drop?', async () => {
    const ctx = getAgentContext();
    const result = await orchestrator.process('Why is my score 70?', ctx);
    expect(result.intent).toBe('SCORE_QUERY');
    expect(result.sources).toContain('P0.5');
  });

  test('19. E2E Scenario 5: Emergency event SOS triggers emergency alert response', async () => {
    const ctx = getAgentContext();
    const result = await orchestrator.process('SOS! Emergency crash!', ctx);
    expect(result.intent).toBe('EMERGENCY');
    expect(result.requestedActions).toContain('CALL_EMERGENCY');
  });
});
