import { VoiceEngine } from '../../frontend/src/modules/voice/VoiceEngine';
import { IntentParser } from '../../frontend/src/modules/voice/IntentParser';
import { VoicePolicy } from '../../frontend/src/modules/voice/VoicePolicy';

describe('Voice-First Driver Interaction Layer (P1.6)', () => {
  let engine: VoiceEngine;

  beforeEach(() => {
    engine = new VoiceEngine();
  });

  test('1. Voice session transitions state sequentially', async () => {
    const session = engine.getSession();
    expect(session.state).toBe('IDLE');

    await engine.startListening();
    expect(session.state).toBe('LISTENING');
  });

  test('2. Low confidence transcript results in fallback error prompt', async () => {
    await engine.startListening();
    engine.getSpeechRecognizer().simulateSpeech('Gibberish', 0.2); // low confidence 0.2

    await new Promise((resolve) => setTimeout(resolve, 10)); // wait for async handlers
    expect(engine.getSession().state).toBe('IDLE');
    expect(engine.getSpeechSynthesizer().getActiveText()).toBe("Sorry, I didn't catch that.");
  });

  test('3. Intent parser matches text keywords to intents', () => {
    const i1 = IntentParser.parse('What is the speed limit?');
    expect(i1.type).toBe('ASK_SPEED_LIMIT');

    const i2 = IntentParser.parse('Why are you warning me?');
    expect(i2.type).toBe('EXPLAIN_ALERT');

    const i3 = IntentParser.parse('Take me to Chennai Airport');
    expect(i3.type).toBe('NAVIGATE_TO');
    expect(i3.parameters.destination).toBe('Chennai Airport');
  });

  test('4. Prohibited actions steering/braking control throws error immediately', () => {
    expect(() => {
      IntentParser.parse('Brake the vehicle now.');
    }).toThrow('Vehicle control commands are strictly prohibited');

    const classification = VoicePolicy.classifyAction('STEER_LEFT');
    expect(classification).toBe('PROHIBITED');
  });

  test('5. Response sentence length policy avoids driver distraction', () => {
    const longText = 'Your route is clear. Continue for 2 kilometres. Note that tolls exist ahead on the bypass.';
    
    // DRIVING mode restricts to first 2 sentences
    const restricted = VoicePolicy.enforceLengthPolicy(longText, 'DRIVING');
    expect(restricted).toBe('Your route is clear. Continue for 2 kilometres.');

    // PARKED mode allows full speech
    const full = VoicePolicy.enforceLengthPolicy(longText, 'PARKED');
    expect(full).toBe(longText);
  });

  test('6. Barge-in stops ongoing TTS speech immediately', async () => {
    await engine.startListening();
    engine.getSpeechRecognizer().simulateSpeech('What is the speed limit?', 0.9);
    
    await new Promise((resolve) => setTimeout(resolve, 10)); // wait for async handlers
    expect(engine.getSession().state).toBe('IDLE');
    expect(engine.getSpeechSynthesizer().getActiveText()).toBe(
      'The speed limit is 80 kilometres per hour. Mapped data is verified.'
    );

    // Speak new command while RESPONDING is in action -> barge-in stops TTS
    engine.getSession().state = 'RESPONDING'; // mock state
    await engine.startListening(); // starts listening, cancels synthesizer
    
    expect(engine.getSpeechSynthesizer().getActiveText()).toBeUndefined();
  });

  test('7. Critical alert interrupts conversational synthesizer immediately', async () => {
    await engine.startListening();
    engine.getSpeechRecognizer().simulateSpeech('What is the speed limit?', 0.9);

    await new Promise((resolve) => setTimeout(resolve, 10)); // wait for async handlers
    // active TTS playing
    expect(engine.getSpeechSynthesizer().getActiveText()).toBeDefined();

    // Critical alert received
    await engine.handleCriticalAlertInterrupt('Wrong way driver approaching!');
    expect(engine.getSpeechSynthesizer().getActiveText()).toBe('Alert: Wrong way driver approaching!');
  });

  // Integration scenarios
  test('Integration Scenario 1: Speed limit inquiry outputs verified mapped data response', async () => {
    await engine.startListening();
    engine.getSpeechRecognizer().simulateSpeech('What is the speed limit?', 0.95);

    await new Promise((resolve) => setTimeout(resolve, 10)); // wait for async handlers
    expect(engine.getSpeechSynthesizer().getActiveText()).toBe(
      'The speed limit is 80 kilometres per hour. Mapped data is verified.'
    );
  });

  test('Integration Scenario 2: Active alert explanation matches telemetry values', async () => {
    await engine.startListening();
    engine.getSpeechRecognizer().simulateSpeech('Why are you warning me?', 0.95);

    await new Promise((resolve) => setTimeout(resolve, 10)); // wait for async handlers
    expect(engine.getSpeechSynthesizer().getActiveText()).toBe(
      'You received an alert because your vehicle speed was 72 kilometres per hour on a 50 segment.'
    );
  });

  test('Integration Scenario 8: User request to steer/brake outputs absolute refusal', async () => {
    await engine.startListening();
    engine.getSpeechRecognizer().simulateSpeech('Can you brake for me?', 0.95);

    await new Promise((resolve) => setTimeout(resolve, 10)); // wait for async handlers
    expect(engine.getSpeechSynthesizer().getActiveText()).toBe(
      'Command blocked. Vehicle control commands are strictly prohibited.'
    );
  });
});
