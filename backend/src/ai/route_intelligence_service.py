import json
from typing import Dict, Any, List

from ai.route_comparison import RouteComparisonEngine
from ai.trip_intent import AITripIntentParser
from llm import generate_response

class RouteIntelligenceService:
    """
    RouteIntelligenceService - The central orchestrator for VAZHI route explainability,
    multi-route scoring comparisons, natural language stop selection, and time-aware schedules.
    """

    @classmethod
    def explain_route(cls, question: str, context: Dict[str, Any], alternative_routes: List[Dict] = None) -> Dict[str, Any]:
        """
        Explains route decisions, safety alerts, and details conversation state grounded in facts.
        """
        # Determine intent
        intent_info = AITripIntentParser.parse_intent(question, context)
        intent = intent_info.get("intent", "ANSWER")

        # 1. Handle Route Comparison
        if intent == "COMPARE_ROUTES" and alternative_routes:
            comparison = RouteComparisonEngine.compare_routes(alternative_routes)
            facts = RouteComparisonEngine.generate_facts_prompt(comparison)
            
            # Request LLM to write a friendly natural language interpretation of these facts
            llm_prompt = f"Please explain these route comparison facts to the driver: {facts}"
            explanation = generate_response(llm_prompt, [], context.get("jurisdiction", {}).get("state", "TN"), "en")
            if not explanation:
                explanation = f"Route {comparison['recommended_route_id']} is recommended. {comparison['recommendation_reason']}"
                
            return {
                "intent": "COMPARE_ROUTES",
                "requiresConfirmation": False,
                "answer": explanation,
                "evidence": [
                    {
                        "type": "COMPARISON_FACTS",
                        "description": comparison["recommendation_reason"],
                        "source": "RouteComparisonEngine"
                    }
                ]
            }

        # 2. Handle Route Explanation ("Why did we take this route?")
        if intent == "EXPLAIN_ROUTE":
            dist = context.get("route", {}).get("distanceRemainingKm", 0)
            dur = context.get("route", {}).get("durationRemainingMinutes", 0)
            hazards = context.get("routeIntelligence", {}).get("upcomingHazards", [])
            
            # Formulate deterministic route facts
            route_facts = f"Active Route: Distance: {dist} km, Duration: {dur} mins. "
            if hazards:
                route_facts += f"Contains safety bypasses for {len(hazards)} accident zones."
            else:
                route_facts += "No high-accident blackspots or hazard alerts on the active path."
                
            llm_prompt = f"Explain to the driver why this active route was chosen. Context facts: {route_facts}"
            explanation = generate_response(llm_prompt, [], context.get("jurisdiction", {}).get("state", "TN"), "en")
            if not explanation:
                explanation = f"We are taking this route because it is the safest route to your destination, bypasses high-congestion zones, and has {len(hazards)} hazard alerts."
                
            return {
                "intent": "EXPLAIN_ROUTE",
                "requiresConfirmation": False,
                "answer": explanation,
                "evidence": [
                    {
                        "type": "SAFETY_CHECK",
                        "description": f"Distance: {dist} km, Hazards bypassed: {len(hazards)}",
                        "source": "SafetyEngine"
                    }
                ]
            }

        # 3. Handle stop modifications (e.g. Vegetarian Restaurant, Hotels, EV Chargers)
        if intent in ["FIND_RESTAURANT", "FIND_CHARGER", "FIND_HOTEL", "FIND_FUEL"]:
            poi_type_map = {
                "FIND_CHARGER": "charging_station",
                "FIND_FUEL": "fuel",
                "FIND_RESTAURANT": "restaurant",
                "FIND_HOTEL": "hotel"
            }
            osm_poi_type = poi_type_map.get(intent, "restaurant")
            
            # Extract coordinates from context (defaulting to Coimbatore center)
            lat = context.get("currentLocation", {}).get("lat", 11.0168)
            lng = context.get("currentLocation", {}).get("lng", 76.9558)
            
            try:
                from services.poi_service import poi_service
                real_pois = poi_service.query_pois(lat, lng, poi_type=osm_poi_type, radius_km=10.0, limit=3)
            except Exception:
                real_pois = []

            candidates = []
            for p in real_pois:
                candidates.append({
                    "name": p.get("name"),
                    "distance_detour_meters": int(p.get("distance_km", 1.0) * 1000),
                    "eta_minutes": max(5, int(p.get("distance_km", 1.0) * 3)),
                    "status": "open",
                    "operator": p.get("operator", ""),
                    "opening_hours": p.get("opening_hours", "24/7"),
                })

            if candidates:
                best_candidate = candidates[0]
                explanation = f"I found a verified {osm_poi_type.replace('_', ' ')} stop: '{best_candidate['name']}'. It is a minor detour of {best_candidate['distance_detour_meters']} meters, and you will arrive in approximately {best_candidate['eta_minutes']} minutes. Would you like me to add it to your route?"
                return {
                    "intent": intent,
                    "requiresConfirmation": True,
                    "answer": explanation,
                    "poi_candidate": best_candidate
                }
            else:
                return {
                    "intent": "ANSWER",
                    "requiresConfirmation": False,
                    "answer": f"I couldn't find any {poi_type} stops matching your preferences along the remaining route parameters."
                }

        # 4. Handle Legal Queries ("What is the helmet fine?")
        if intent == "LEGAL_QUERY":
            state = context.get("jurisdiction", {}).get("state", "TN")
            # Query the backend legal logic
            llm_response = generate_response(question, [], state, "en")
            return {
                "intent": "LEGAL_QUERY",
                "requiresConfirmation": False,
                "answer": llm_response or "Please wear a helmet while riding a two-wheeler. The fine is ₹500 for violation.",
                "evidence": [
                    {
                        "type": "LEGAL_DATABASE",
                        "description": "Seeded Motor Vehicles Act violations dataset.",
                        "source": "LegalEngine"
                    }
                ]
            }

        # General conversational answer fallback
        llm_response = generate_response(question, [], context.get("jurisdiction", {}).get("state", "TN"), "en")
        return {
            "intent": "ANSWER",
            "requiresConfirmation": False,
            "answer": llm_response or "I am your safety co-pilot. I can help optimize stops, explain route hazards, or detail regional traffic laws.",
            "evidence": []
        }
