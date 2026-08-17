from typing import Dict, Any

class AIContextDecisionEngine:
    """
    AIContextDecisionEngine - Decides the complexity level of voice outputs:
    gating when to use fast local templates vs when to trigger server-side LLM summaries.
    """

    @staticmethod
    def evaluate_voice_action(event: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decision criteria based on telemetry, active hazards, and duration:
        Returns:
            {
               "decision": "DO_NOT_SPEAK" | "TEMPLATE_WARNING" | "AI_GENERATED_WARNING" | "AI_ACTION_REQUIRED",
               "template_id": str (if template),
               "message": str (if static or generated context summary)
            }
        """
        event_type = event.get("type")
        severity = event.get("severity", "low").lower()

        # Extract context attributes
        continuous_driving_mins = context.get("trip", {}).get("continuous_driving_minutes", 0)
        weather_condition = context.get("weather", {}).get("condition", "clear").lower()
        current_speed = context.get("currentSpeedKmh", 0)
        speed_limit = context.get("speedLimitKmh", 0)

        # 1. Complex Context Rule: High curvature/hazard + heavy weather + long duration
        is_long_drive = continuous_driving_mins >= 240 # 4 hours
        is_hazard_weather = weather_condition in ["rain", "storm", "fog", "heavy rain"]
        is_high_risk = severity == "high" or current_speed > (speed_limit + 15)

        if is_long_drive and is_hazard_weather and is_high_risk:
            # Generate a custom AI warning alert combining elements safely
            warning_msg = (
                f"You've been driving for {continuous_driving_mins // 60} hours. "
                f"There is a warning for {weather_condition} on the upcoming mountain pass. "
                "Consider taking a rest break at the next transit area before climbing."
            )
            return {
                "decision": "AI_GENERATED_WARNING",
                "message": warning_msg
            }

        # 2. Simple Warnings (Gated by local templates to keep latency at zero)
        if event_type == "SHARP_CURVE":
            distance = event.get("distance_meters", 150)
            return {
                "decision": "TEMPLATE_WARNING",
                "template_id": "sharp_curve_alert",
                "message": f"Sharp curve ahead in {distance} meters. Slow down."
            }

        if event_type == "SPEED_BREAKER":
            distance = event.get("distance_meters", 100)
            return {
                "decision": "TEMPLATE_WARNING",
                "template_id": "speed_breaker_alert",
                "message": f"Speed breaker ahead in {distance} meters."
            }

        if event_type == "STATE_BORDER":
            new_state = event.get("state_name", "a new state")
            return {
                "decision": "TEMPLATE_WARNING",
                "template_id": "state_border_alert",
                "message": f"Entering {new_state}. Keep documents ready."
            }

        # 3. Speed limit violation warning
        if current_speed > speed_limit and speed_limit > 0:
            if current_speed >= (speed_limit + 10):
                return {
                    "decision": "TEMPLATE_WARNING",
                    "template_id": "speed_limit_alert",
                    "message": f"You are exceeding the speed limit of {speed_limit} km/h. Please slow down."
                }

        # Default action
        return {
            "decision": "DO_NOT_SPEAK",
            "message": ""
        }
