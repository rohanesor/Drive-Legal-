import { Route } from './types';

export class NavigationExplanationEngine {
  static explainRouteSelection(selected: Route, alternative: Route): string {
    const timeDiff = alternative.durationSeconds - selected.durationSeconds;
    const distanceDiff = alternative.distanceMeters - selected.distanceMeters;

    let explanation = `Route was selected because it is `;
    if (timeDiff > 0) {
      explanation += `${Math.round(timeDiff / 60)} minutes faster `;
    } else {
      explanation += 'comparable in travel duration ';
    }

    if (selected.score.riskCost < alternative.score.riskCost) {
      explanation += 'and has lower safety risk details.';
    } else {
      explanation += 'with equivalent segment safety metrics.';
    }

    return explanation;
  }
}
export default NavigationExplanationEngine;
