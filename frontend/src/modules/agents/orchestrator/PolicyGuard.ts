import { AgentResult } from './types';

export class PolicyGuard {
  /**
   * Post-processes agent responses to enforce compliance rules (e.g. safety boundaries, no definite legal claims).
   */
  static sanitizeResult(result: AgentResult): AgentResult {
    let sanitizedAnswer = result.answer;

    // Check for absolute legal claims and rewrite them
    const forbiddenClaims = [
      /you are definitely getting a challan/gi,
      /you are definitely getting fined/gi,
      /you will get fined/gi,
      /you will definitely receive a fine/gi,
      /you will receive a ticket/gi,
      /you violate the law/gi,
    ];

    const safeReplacement = 'A potential traffic violation warning has been detected. Please align driving behavior with local rules.';

    forbiddenClaims.forEach((regex) => {
      if (regex.test(sanitizedAnswer)) {
        sanitizedAnswer = sanitizedAnswer.replace(regex, safeReplacement);
      }
    });

    return {
      ...result,
      answer: sanitizedAnswer,
    };
  }
}
export default PolicyGuard;
