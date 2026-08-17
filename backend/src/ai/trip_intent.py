import json
import re
from typing import Dict, Any

class AITripIntentParser:
    """
    AITripIntentParser - Translates natural language driver requests into 
    structured routing intents to safely interact with POI and Routing engines.
    """

    INTENTS = [
        "ANSWER", "EXPLAIN_ROUTE", "COMPARE_ROUTES", "ADD_WAYPOINT", 
        "REMOVE_WAYPOINT", "CHANGE_DESTINATION", "AVOID_TOLL", 
        "AVOID_HIGHWAYS", "FIND_RESTAURANT", "FIND_HOTEL", "FIND_FUEL", 
        "FIND_CHARGER", "FIND_REST_STOP", "SAFETY_ADVICE", "LEGAL_QUERY"
    ]

    @classmethod
    def parse_intent(cls, user_text: str, current_context: Dict = None) -> Dict[str, Any]:
        text_lower = user_text.lower().strip()

        # Deterministic Regex & Rule-Based Intent Resolver (Instant Fallback / Primary Engine)
        
        # 1. Avoid Tolls / Highways
        if "avoid toll" in text_lower or "no toll" in text_lower:
            return {"intent": "AVOID_TOLL", "requiresConfirmation": True, "reason": "User requested route modification to avoid toll plazas."}
        if "avoid highway" in text_lower or "no highway" in text_lower:
            return {"intent": "AVOID_HIGHWAYS", "requiresConfirmation": True, "reason": "User requested route modification to bypass major highways."}

        # 2. Find Charging Station (EV)
        if "charge" in text_lower or "charging" in text_lower or "ev station" in text_lower:
            # Check context for state of charge (SOC) threshold
            soc_limit = 30
            if current_context and current_context.get("vehicle", {}).get("fuelType") == "EV":
                # Match "battery reaches X%" or SOC patterns
                match = re.search(r'(\d+)%', text_lower)
                if match:
                    soc_limit = int(match.group(1))
            return {
                "intent": "FIND_CHARGER",
                "requiresConfirmation": True,
                "reason": f"Locate EV charging facility along route before range limits.",
                "poiQuery": {
                    "category": "charging_station",
                    "soc_threshold": soc_limit
                }
            }

        # 3. Find Hotel / Lodging
        if "hotel" in text_lower or "stay" in text_lower or "lodge" in text_lower:
            hours_limit = 6
            match = re.search(r'(\d+)\s*hour', text_lower)
            if match:
                hours_limit = int(match.group(1))
            return {
                "intent": "FIND_HOTEL",
                "requiresConfirmation": True,
                "reason": f"Locate lodging option after driving parameters.",
                "poiQuery": {
                    "category": "hotel",
                    "driving_hours_threshold": hours_limit
                }
            }

        # 4. Find Restaurant
        if "restaurant" in text_lower or "food" in text_lower or "veg" in text_lower or "eat" in text_lower or "lunch" in text_lower:
            diet = "any"
            if "veg" in text_lower:
                diet = "vegetarian"
            cuisine = "any"
            if "south indian" in text_lower or "south_indian" in text_lower:
                cuisine = "south_indian"
            return {
                "intent": "FIND_RESTAURANT",
                "requiresConfirmation": True,
                "reason": f"Locate restaurant matching driver cuisine/diet parameters.",
                "poiQuery": {
                    "category": "restaurant",
                    "diet": diet,
                    "cuisine": cuisine,
                    "onRoute": True
                }
            }

        # 5. Find Fuel Station
        if "fuel" in text_lower or "petrol" in text_lower or "diesel" in text_lower or "gas station" in text_lower:
            return {
                "intent": "FIND_FUEL",
                "requiresConfirmation": True,
                "reason": "Locate fuel station along path.",
                "poiQuery": {
                    "category": "fuel_station"
                }
            }

        # 6. Route Explanations / Comparisons
        if "why" in text_lower and ("route" in text_lower or "this way" in text_lower or "take" in text_lower):
            return {"intent": "EXPLAIN_ROUTE", "requiresConfirmation": False, "reason": "Query about route selection properties."}
        if "safer" in text_lower or "compare" in text_lower or "which route" in text_lower:
            return {"intent": "COMPARE_ROUTES", "requiresConfirmation": False, "reason": "Requesting comparison metrics for alternative routes."}

        # 7. Add / Remove waypoint
        if "add stop" in text_lower or "add waypoint" in text_lower:
            return {"intent": "ADD_WAYPOINT", "requiresConfirmation": True, "reason": "Request to add waypoint to path."}
        if "remove stop" in text_lower or "remove waypoint" in text_lower:
            return {"intent": "REMOVE_WAYPOINT", "requiresConfirmation": True, "reason": "Request to remove active waypoint."}

        # 8. Legal queries
        if any(w in text_lower for w in ["fine", "penalty", "rule", "law", "police", "license"]):
            return {"intent": "LEGAL_QUERY", "requiresConfirmation": False, "reason": "Query about traffic rules or RTO penalties."}

        # Default fallback
        return {
            "intent": "ANSWER",
            "requiresConfirmation": False,
            "reason": "General conversational query."
        }
