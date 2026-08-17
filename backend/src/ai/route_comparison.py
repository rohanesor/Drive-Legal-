import json
from typing import List, Dict

class RouteComparisonEngine:
    """
    RouteComparisonEngine - Calculates deterministic safety, legal, and operational 
    comparison metrics between multiple candidate routes to ground the LLM's explanation.
    """

    @staticmethod
    def compare_routes(routes: List[Dict]) -> Dict:
        if not routes:
            return {"status": "error", "message": "No routes provided for comparison"}

        compared_data = []
        for idx, route in enumerate(routes):
            route_id = route.get("id", f"Route_{idx + 1}")
            name = route.get("name", f"Alternative Route {idx + 1}")
            distance_km = route.get("distance_meters", 0) / 1000.0
            duration_mins = round(route.get("duration_seconds", 0) / 60.0)
            
            # Deterministic counting
            hazards_count = len(route.get("hazards", []))
            speed_breakers_count = len(route.get("speed_breakers", []))
            sharp_curves_count = len(route.get("sharp_curves", []))
            zones_count = len(route.get("zones", []))
            tolls_count = route.get("tolls_count", 0)
            toll_cost = route.get("toll_cost", 0)
            
            # Charging stops or fuel stations count
            stations_count = len(route.get("energy_stops", []))

            # Calculate deterministic safety score (out of 100)
            # Starts at 100, penalize for hazards, sharp curves, and speed limits violation potential
            safety_penalty = (hazards_count * 15) + (sharp_curves_count * 5) + (speed_breakers_count * 2)
            safety_score = max(30, 100 - safety_penalty)

            # Determine legal complexity index (0 to 10 scale)
            legal_complexity = min(10, (zones_count * 2) + (1 if route.get("crosses_state_border") else 0))

            compared_data.append({
                "id": route_id,
                "name": name,
                "distance_km": round(distance_km, 2),
                "duration_minutes": duration_mins,
                "safety_score": safety_score,
                "legal_complexity": legal_complexity,
                "hazards_count": hazards_count,
                "speed_breakers_count": speed_breakers_count,
                "sharp_curves_count": sharp_curves_count,
                "tolls_count": tolls_count,
                "toll_cost": toll_cost,
                "stations_count": stations_count,
                "crosses_state_border": route.get("crosses_state_border", False)
            })

        # Find the overall recommended route based on safety score and duration
        best_route = min(compared_data, key=lambda r: (-r["safety_score"], r["duration_minutes"]))

        return {
            "routes": compared_data,
            "recommended_route_id": best_route["id"],
            "recommendation_reason": f"Route '{best_route['name']}' has the best combination of safety rating ({best_route['safety_score']}%) and travel duration ({best_route['duration_minutes']} mins)."
        }

    @staticmethod
    def generate_facts_prompt(comparison_result: Dict) -> str:
        """
        Formats the comparison results into a structured text context block
        to strictly ground the LLM's conversational explanation.
        """
        facts = "DETERMINISTIC ROUTE COMPARISON FACTS:\n"
        for r in comparison_result.get("routes", []):
            facts += f"- Route {r['id']} ({r['name']}): "
            facts += f"Distance: {r['distance_km']} km, Duration: {r['duration_minutes']} mins. "
            facts += f"Safety Score: {r['safety_score']}%, Legal Complexity: {r['legal_complexity']}/10. "
            facts += f"Hazards: {r['hazards_count']}, Curves: {r['sharp_curves_count']}, Bumps: {r['speed_breakers_count']}, Tolls: {r['tolls_count']} (Cost: ₹{r['toll_cost']}), Chargers/Fuel Stations: {r['stations_count']}.\n"
        
        facts += f"Best Deterministic Option: Route {comparison_result.get('recommended_route_id')} ({comparison_result.get('recommendation_reason')})\n"
        facts += "INSTRUCTION: You must strictly base your response on these facts. Do not invent details or values."
        return facts
