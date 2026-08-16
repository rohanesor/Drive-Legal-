import json
import re
from typing import Dict, List, Optional

from database import initialize_database, get_laws, get_penalties, save_chat_history, get_all_penalties_by_state
from search import search
from zones import check_zones
from stt import transcribe_audio
from tts import speak_text
from llm import generate_response, unload_model
from sync_service import sync_on_app_launch
from search_enhancer import get_enriched_response


def initialize() -> str:
    try:
        initialize_database()
        sync_result = sync_on_app_launch()
        return json.dumps({'status': 'success', 'message': 'DriveLegal initialized', 'sync': sync_result})
    except Exception as e:
        return json.dumps({'status': 'error', 'code': 'INIT_ERROR', 'message': str(e)})


def handle_query(json_payload: str) -> str:
    try:
        payload = json.loads(json_payload)
        action = payload.get('action')
        if action == 'get_penalties':
            state = payload.get('state', 'TN')
            penalties = get_all_penalties_by_state(state)
            return json.dumps({'status': 'success', 'penalties': penalties})

        if action == 'health':
            try:
                import sqlite3
                import os
                db_dir = os.path.dirname(os.path.abspath(__file__))
                db_path = os.path.join(db_dir, 'data', 'drivelegal.db')
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                c.execute("SELECT count(*) FROM laws")
                laws = c.fetchone()[0]
                c.execute("SELECT count(*) FROM penalties")
                penalties = c.fetchone()[0]
                c.execute("SELECT count(*) FROM zones")
                zones = c.fetchone()[0]
                conn.close()
                return json.dumps({
                    'status': 'success',
                    'health': {
                        'status': 'healthy',
                        'database': 'connected',
                        'laws_count': laws,
                        'penalties_count': penalties,
                        'zones_count': zones
                    }
                })
            except Exception as db_err:
                return json.dumps({
                    'status': 'success',
                    'health': {
                        'status': 'unhealthy',
                        'database': 'disconnected',
                        'error': str(db_err)
                    }
                })

        if action == 'get_speed_limit':
            return handle_speed_limit_query(json_payload)

        result = execute_pipeline(payload)
        return json.dumps({'status': 'success', **result})
    except Exception as e:
        return json.dumps({'status': 'error', 'code': 'UNKNOWN_ERROR', 'message': str(e)})


def is_vague_query(text: str) -> bool:
    text = text.strip().lower()
    vague_keywords = ['fine', 'penalty', 'rule', 'law', 'parking', 'helmet', 'speed', 'license', 'drunk driving', 'can i park']
    words = text.split()
    if len(words) <= 3:
        if any(kw in text for kw in vague_keywords):
            return True
    return False


def get_clarification_prompt(text: str, state: str, has_gps: bool) -> str:
    text = text.strip().lower()
    if 'park' in text:
        if not has_gps:
            return "I can check parking rules for you, but I don't have your precise GPS location. Could you share your location or tell me which area/city you're in?"
        return f"I see you're asking about parking. Are you trying to park at your current location in {state}, or do you want to know about general 'No Parking' fines?"
    if 'helmet' in text:
        return f"I'd be happy to explain helmet laws in {state}. Are you asking about the fine for the rider, or the rules for a pillion passenger?"
    if 'fine' in text or 'penalty' in text:
        return "Fines vary based on the specific traffic violation. Which offense are you inquiring about?"

    return "Could you provide a little more context? For example, are you asking about a specific fine or a general road rule?"


STATE_NAMES = {
    'TN': 'Tamil Nadu',
    'KN': 'Karnataka',
    'KL': 'Kerala',
    'MH': 'Maharashtra',
    'DL': 'Delhi',
    'AP': 'Andhra Pradesh',
    'TS': 'Telangana',
    'KA': 'Karnataka'
}

def get_location_label(state: str, city: str = None, district: str = None, language: str = 'en') -> str:
    state_fullname = STATE_NAMES.get(state.upper(), state)
    if language == 'ta':
        if state.upper() == 'TN': state_fullname = 'தமிழ்நாடு'
        if state.upper() == 'KN': state_fullname = 'கர்நாடகா'
        if city and district:
            return f"{city}, {district}, {state_fullname}"
        elif district:
            return f"{district}, {state_fullname}"
        return state_fullname
    elif language == 'hi':
        if state.upper() == 'TN': state_fullname = 'तमिलनाडु'
        if state.upper() == 'KN': state_fullname = 'कर्नाटक'
        if city and district:
            return f"{city}, {district}, {state_fullname}"
        elif district:
            return f"{district}, {state_fullname}"
        return state_fullname
    else:
        if city and district:
            return f"{city}, {district}, {state_fullname}"
        elif district:
            return f"{district}, {state_fullname}"
        return state_fullname

def get_single_fine(violation_type: str, state: str, city: str = None, district: str = None) -> str:
    """Helper to query localized fines from SQLite."""
    try:
        from database import get_penalties
        p_list = get_penalties(violation_type, state, city, district)
        if p_list:
            return p_list[0].get('first_offense', 'N/A')
    except Exception:
        pass
    return 'N/A'

def generate_location_fines_summary(state: str, city: str = None, district: str = None, language: str = 'en') -> str:
    """Generate a clean, professional, localized summary of the major traffic fines for a location."""
    speeding_fine = get_single_fine('speeding', state, city, district)
    if speeding_fine == 'N/A':
        speeding_fine = get_single_fine('overspeeding_lmv', state, city, district)
        
    helmet_fine = get_single_fine('no_helmet', state, city, district)
    seatbelt_fine = get_single_fine('no_seatbelt', state, city, district)
    if seatbelt_fine == 'N/A':
        seatbelt_fine = get_single_fine('no_seat_belt', state, city, district)
        
    license_fine = get_single_fine('no_license', state, city, district)
    if license_fine == 'N/A':
        license_fine = get_single_fine('driving_without_licence', state, city, district)
        
    insurance_fine = get_single_fine('no_insurance', state, city, district)
    if insurance_fine == 'N/A':
        insurance_fine = get_single_fine('vehicle_insurance', state, city, district)
        
    drunk_fine = get_single_fine('drunk_driving', state, city, district)
    if drunk_fine == 'N/A':
        drunk_fine = get_single_fine('road_safety_drunk_driving', state, city, district)

    # Standard fallback values if still N/A
    if speeding_fine == 'N/A': speeding_fine = '₹500'
    if helmet_fine == 'N/A': helmet_fine = '₹500'
    if seatbelt_fine == 'N/A': seatbelt_fine = '₹500'
    if license_fine == 'N/A': license_fine = '₹5,000'
    if insurance_fine == 'N/A': insurance_fine = '₹2,000'
    if drunk_fine == 'N/A': drunk_fine = '₹10,000'

    location_name = get_location_label(state, city, district, language)
    
    if language == 'ta':
        summary = (
            f"📍 **உங்கள் தற்போதைய இருப்பிடமான {location_name} அடிப்படையில்:**\n\n"
            f"இங்குள்ள முக்கிய போக்குவரத்து அபராதங்களின் விவரங்கள்:\n"
            f"• **அதிவேகமாக ஓட்டுதல் (Speeding):** {speeding_fine}\n"
            f"• **ஹெல்மெட் அணியாமல் ஓட்டுதல் (No Helmet):** {helmet_fine}\n"
            f"• **சீட் பெல்ட் அணியாமல் ஓட்டுதல் (No Seatbelt):** {seatbelt_fine}\n"
            f"• **ஓட்டுநர் உரிமம் இல்லாமல் ஓட்டுதல் (No License):** {license_fine}\n"
            f"• **காப்பீடு இல்லாமல் ஓட்டுதல் (No Insurance):** {insurance_fine}\n"
            f"• **குடிபோதையில் ஓட்டுதல் (Drunk Driving):** {drunk_fine}\n\n"
            f"*பாதுகாப்பாக ஓட்டவும்! போக்குவரத்து விதிகளை மதிக்கவும்.*"
        )
    elif language == 'hi':
        summary = (
            f"📍 **आपके वर्तमान स्थान {location_name} के आधार पर:**\n\n"
            f"यहाँ के मुख्य ट्रैफिक जुर्माने की सूची:\n"
            f"• **ओवरस्पीडिंग (Speeding):** {speeding_fine}\n"
            f"• **बिना हेलमेट ड्राइविंग (No Helmet):** {helmet_fine}\n"
            f"• **बिना सीट बेल्ट ड्राइविंग (No Seatbelt):** {seatbelt_fine}\n"
            f"• **बिना लाइसेंस ड्राइविंग (No License):** {license_fine}\n"
            f"• **बिना बीमा ड्राइविंग (No Insurance):** {insurance_fine}\n"
            f"• **शराब पीकर ड्राइविंग (Drunk Driving):** {drunk_fine}\n\n"
            f"*सुरक्षित रूप से चलाएं! ट्रैफिक नियमों का पालन करें।*"
        )
    else:
        summary = (
            f"📍 **Based on your current location in {location_name}:**\n\n"
            f"Here are the active traffic fines and details for this location:\n"
            f"• **Overspeeding:** {speeding_fine}\n"
            f"• **Driving without Helmet:** {helmet_fine}\n"
            f"• **Driving without Seatbelt:** {seatbelt_fine}\n"
            f"• **Driving without License:** {license_fine}\n"
            f"• **Driving without Insurance:** {insurance_fine}\n"
            f"• **Drunk Driving:** {drunk_fine}\n\n"
            f"*Safe driving! Please keep your documents updated.*"
        )
    return summary


from typing import Optional

def handle_navigation_query(text: str, context: Dict, language: str) -> Optional[str]:
    if not context or not context.get('isNavigating'):
        return None
        
    text_lower = text.lower().strip()
    
    # English keywords
    nav_keywords = ['destination', 'how far', 'eta', 'remaining', 'left to go', 'route', 'safety score', 'dangerous', 'hazard', 'next step', 'instruction', 'turn']
    
    # Tamil keywords
    tamil_nav_keywords = ['இலக்கு', 'எவ்வளவு தூரம்', 'மீதமுள்ள', 'வழி', 'பாதுகாப்பு', 'அபாயம்', 'அடுத்த படி', 'வழிமுறை', 'திருப்பு']
    
    # Hindi keywords
    hindi_nav_keywords = ['मंजिल', 'कितनी दूर', 'शेष', 'रास्ता', 'सुरक्षा', 'खतरा', 'अगला कदम', 'निर्देश', 'मोड़']

    is_nav_query = any(k in text_lower for k in nav_keywords) or \
                   any(k in text_lower for k in tamil_nav_keywords) or \
                   any(k in text_lower for k in hindi_nav_keywords)

    if not is_nav_query:
        return None

    dest_name = context.get('destinationName', 'your destination')
    dist_rem = context.get('distanceRemaining', 0)
    dur_rem = context.get('durationRemaining', 0)
    next_step = context.get('currentStepInstruction', 'proceed safely')
    safety_score = context.get('routeSafetyScore', 100)
    route_name = context.get('activeRouteName', 'Recommended Route')

    # Calculations
    dist_km = dist_rem / 1000.0
    time_min = round(dur_rem / 60.0)

    if language == 'ta':
        if any(k in text_lower for k in ['far', 'தூரம்', 'remaining', 'மீதமுள்ள', 'eta', 'நேரம்']):
            return f"உங்கள் இலக்கை அடைய இன்னும் {dist_km:.1f} கி.மீ தூரம் உள்ளது. இதற்கு தோராயமாக {time_min} நிமிடங்கள் ஆகும்."
        if any(k in text_lower for k in ['destination', 'இலக்கு', 'மஞ்சில்']):
            return f"நீங்கள் இப்போது {dest_name} நோக்கிச் சென்று கொண்டிருக்கிறீர்கள்."
        if any(k in text_lower for k in ['route', 'வழி', 'safety', 'பாதுகாப்பு', 'hazard', 'அபாயம்']):
            return f"நீங்கள் தற்போது '{route_name}' வழியில் செல்கிறீர்கள். இதனுடைய பாதுகாப்பு மதிப்பீடு {safety_score}% ஆகும். வழியில் எந்தவொரு பெரிய ஆபத்தும் கண்டறியப்படவில்லை."
        if any(k in text_lower for k in ['step', 'படி', 'instruction', 'வழிமுறை', 'next', 'turn', 'திருப்பு']):
            return f"உங்களின் அடுத்த வழிமுறை: '{next_step}'."
        return f"நீங்கள் இப்போது '{route_name}' வழியாக {dest_name} நோக்கிச் செல்கிறீர்கள். மீதமுள்ள தூரம்: {dist_km:.1f} கி.மீ ({time_min} நிமிடங்கள்). பாதுகாப்பு மதிப்பீடு: {safety_score}%."

    elif language == 'hi':
        if any(k in text_lower for k in ['far', 'दूर', 'remaining', 'शेष', 'eta']):
            return f"आपकी मंजिल पहुँचने में {dist_km:.1f} किमी शेष है। इसमें लगभग {time_min} मिनट लगेंगे।"
        if any(k in text_lower for k in ['destination', 'मंजिल']):
            return f"आप अभी {dest_name} की ओर जा रहे हैं।"
        if any(k in text_lower for k in ['route', 'रास्ता', 'safety', 'सुरक्षा', 'hazard', 'खतरा']):
            return f"आप वर्तमान में '{route_name}' मार्ग पर हैं। इस मार्ग का सुरक्षा स्कोर {safety_score}% है और कोई बड़ा खतरा नहीं है।"
        if any(k in text_lower for k in ['step', 'कदम', 'instruction', 'निर्देश', 'next', 'turn', 'मोड़']):
            return f"आपका अगला निर्देश है: '{next_step}'।"
        return f"आप अभी '{route_name}' से होते हुए {dest_name} जा रहे हैं। शेष दूरी: {dist_km:.1f} किमी ({time_min} मिनट)। सुरक्षा स्कोर: {safety_score}%।"

    else:
        if any(k in text_lower for k in ['far', 'distance', 'remaining', 'left', 'eta', 'time']):
            return f"You have {dist_km:.1f} km remaining to reach your destination. It will take approximately {time_min} minutes."
        if any(k in text_lower for k in ['destination', 'target']):
            return f"You are currently navigating to {dest_name}."
        if any(k in text_lower for k in ['route', 'safety', 'score', 'hazard', 'danger']):
            return f"You are driving on '{route_name}' with a safety rating of {safety_score}%. No major hazards detected on this route."
        if any(k in text_lower for k in ['step', 'instruction', 'next', 'turn']):
            return f"Your next turn instruction is: '{next_step}'."
        return f"Navigating to {dest_name} via '{route_name}'. Remaining: {dist_km:.1f} km ({time_min} mins). Route Safety: {safety_score}%."


def execute_pipeline(payload: Dict) -> Dict:
    text = payload.get('text', '')
    audio_uri = payload.get('audio_uri')
    location = payload.get('location', {})
    language = payload.get('language', 'en')
    state = location.get('state', 'TN')
    lat = location.get('lat', 0)
    lng = location.get('lng', 0)
    city = location.get('city')
    district = location.get('district')
    history = payload.get('history', [])

    has_gps = lat != 0

    if audio_uri:
        text = transcribe_audio(audio_uri, language)
        if not text:
            return {'response_text': 'I couldn\'t hear you clearly. Could you repeat that or type it?', 'confidence': 0}

    # Contextual Navigation queries check
    navigation_context = payload.get('navigationContext', {})
    nav_response = handle_navigation_query(text, navigation_context, language)
    if nav_response:
        response_audio_uri = speak_text(nav_response, language)
        return {
            'response_text': nav_response,
            'response_audio_uri': response_audio_uri,
            'source_sections': [],
            'confidence': 0.99,
            'detected_language': language,
            'transcription': text,
        }

    # Intercept generic queries about fines or rules for user's location
    text_lower = text.lower().strip()
    location_keywords = ['my location', 'around me', 'here', 'this place', 'local fines', 'local rules', 'fines and details', 'around here']
    tamil_location_keywords = ['என் இடம்', 'இங்கே', 'இங்க', 'என் ஏரியா', 'இருப்பிடம்', 'இங்குள்ள அபராதம்', 'என் ஊர்']
    hindi_location_keywords = ['मेरी जगह', 'यहाँ', 'इधर', 'मेरा लोकेशन', 'यहाँ का जुर्माना', 'लोकल', 'आसपास']
    
    is_location_query = any(k in text_lower for k in location_keywords) or \
                        any(k in text_lower for k in tamil_location_keywords) or \
                        any(k in text_lower for k in hindi_location_keywords)
                        
    fine_keywords = ['fine', 'penalty', 'amount', 'rule', 'charge', 'challan', 'violation', 'detail']
    tamil_fine_keywords = ['அபராதம்', 'சட்டம்', 'விதி', 'தண்டனை', 'செல்லுபடியாகும்', 'விவரம்']
    hindi_fine_keywords = ['जुर्माना', 'नियम', 'चालान', 'कितना', 'डिटेल', 'विस्तार']
    
    is_fine_query = any(k in text_lower for k in fine_keywords) or \
                    any(k in text_lower for k in tamil_fine_keywords) or \
                    any(k in text_lower for k in hindi_fine_keywords)
                    
    is_explicit_location_fines = ("fine" in text_lower or "penalty" in text_lower or "rules" in text_lower or "அபராதம்" in text_lower or "जुर्माना" in text_lower) and \
                                  ("location" in text_lower or "here" in text_lower or "இங்கே" in text_lower or "यहाँ" in text_lower)
                                  
    if (is_location_query and is_fine_query) or is_explicit_location_fines or (text_lower in ['fines', 'fines list', 'local fines', 'அபராதங்கள்', 'जुर्माना सूची']):
        summary = generate_location_fines_summary(state, city, district, language)
        if summary:
            return {
                'response_text': summary,
                'source_sections': [],
                'confidence': 0.99,
                'detected_language': language,
                'transcription': text,
            }

    # 1. Conversational Clarification Check
    if not history and is_vague_query(text):
        return {
            'response_text': get_clarification_prompt(text, state, has_gps),
            'suggested_prompts': get_contextual_suggestions(text, state),
            'is_follow_up': True
        }

    # 2. Contextual Search
    laws = search(text, top_k=3, state=state)

    if not laws:
        return {
            'response_text': f"I don't have specific data on that in my offline database for {state}. I recommend checking the official MVD website or asking about more common violations.",
            'suggested_prompts': ["Common fines in " + state, "Speed limits", "Helmet rules"]
        }

    # 3. LLM Response Generation
    response_text = generate_response(text, laws, state, language, history=history)

    if not response_text:
        response_text = build_template_response(laws, [], state)

    source_sections = validate_citations(response_text, laws)
    response_audio_uri = speak_text(response_text, language)

    # 4. Proactive Enrichment
    enriched = get_enriched_response(text, laws, state, language)

    # Check for zones if "parking" or "can I" is mentioned
    extra_context = ""
    if 'park' in text.lower() and has_gps:
        zones = check_zones(location.get('lat', 0), location.get('lng', 0), state)
        if zones:
            z = zones[0]
            if z.get('zone_type') == 'no_parking':
                extra_context = f"\n\n⚠️ NOTE: You are currently in a {z.get('zone_name')}. Parking here is strictly prohibited."

    final_response = response_text + extra_context
    save_chat_history(text, final_response, state)

    return {
        'response_text': final_response,
        'response_audio_uri': response_audio_uri,
        'source_sections': source_sections,
        'confidence': round(laws[0].get('similarity', 0), 2),
        'suggested_prompts': get_follow_up_suggestions(text, laws, state),
        'real_time_alerts': enriched.get('real_time_context', {}).get('alerts', []),
    }


def get_contextual_suggestions(text: str, state: str) -> List[str]:
    text = text.lower()
    if 'park' in text: return ["No parking fine", "Parking at current location", "Footpath parking rules"]
    if 'helmet' in text: return [f"Fine in {state}", "Pillion rules", "Sikh helmet exemption"]
    return ["What is the fine?", "Show me the sections"]


def get_follow_up_suggestions(text: str, laws: List[Dict], state: str) -> List[str]:
    text = text.lower()
    if 'helmet' in text: return ["Pillion rider fine", "Repeat offense penalty"]
    if 'license' in text: return ["Digital DL validity", "Expired license penalty"]
    return [f"Other rules in {state}", "My legal rights"]


def build_template_response(laws: List[Dict], penalties: List[Dict], state: str) -> str:
    law = laws[0]
    return f"Based on Section {law.get('section', 'of the Act')}: {law.get('description', '')}. In {state}, the typical fine for this is ₹500 - ₹1000."


def validate_citations(response_text: str, laws: List[Dict]) -> List[str]:
    citations = re.findall(r'(?:§|Section|section|Rule)\s*\d+[A-Z]*', response_text)
    valid = set(l.get('section', '') for l in laws)
    found = []
    for cit in citations:
        c = re.sub(r'[^0-9A-Z]', '', cit.upper())
        for v in valid:
            if c in re.sub(r'[^0-9A-Z]', '', v.upper()):
                if v not in found: found.append(v)
    return found if found else list(valid)[:2]


def handle_zone_check(json_payload: str) -> str:
    try:
        payload = json.loads(json_payload)
        location = payload.get('location', {})
        alerts = check_zones(location.get('lat', 0), location.get('lng', 0), location.get('state', 'TN'))
        return json.dumps(alerts[0] if alerts else {'status': 'no_alert'})
    except Exception as e:
        return json.dumps({'status': 'error', 'message': str(e)})


# --- Speed Limit Constants & Handler ---

DEFAULT_SPEED_LIMITS = {
    'TN': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'KN': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'AP': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'KL': {'urban': 50, 'rural': 70, 'highway': 85, 'expressway': 110},
    'MH': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'DL': {'urban': 50, 'rural': 70, 'highway': 90, 'expressway': 100},
    'GJ': {'urban': 60, 'rural': 80, 'highway': 100, 'expressway': 120},
    'RJ': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'UP': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'WB': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'TS': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'BR': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'HR': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'PB': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'OR': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'MP': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 120},
    'DEFAULT': {'urban': 50, 'rural': 80, 'highway': 100, 'expressway': 100}
}

VEHICLE_LIMIT_ADJUSTMENTS = {
    'car': {'urban': 0, 'rural': 0, 'highway': 0, 'expressway': 0},
    'motorcycle': {'urban': -10, 'rural': -10, 'highway': -20, 'expressway': -40},
    'heavy': {'urban': -10, 'rural': -20, 'highway': -20, 'expressway': -40}
}


def handle_speed_limit_query(json_payload: str) -> str:
    """
    Get speed limit for a given lat/lng from database speed zones or state defaults.
    """
    try:
        payload = json.loads(json_payload)
        lat = payload.get('lat', 0.0)
        lng = payload.get('lng', 0.0)
        state = payload.get('state', 'TN').upper()
        vehicle_type = payload.get('vehicle_type', 'car')

        # 1. Query database for speed zones at the location
        from database import get_zones
        matched_zones = get_zones(lat, lng, state)
        for zone in matched_zones:
            if zone.get('speed_limit'):
                if zone.get('center_lat') and zone.get('center_lng'):
                    from zones import haversine
                    dist = haversine(lat, lng, zone['center_lat'], zone['center_lng'])
                    if dist <= zone.get('radius_meters', 500):
                        return json.dumps({
                            'status': 'success',
                            'speed_limit': zone['speed_limit'],
                            'source': 'osm'
                        })
                elif zone.get('polygon'):
                    try:
                        from zones import point_in_polygon
                        poly = json.loads(zone['polygon'])
                        if point_in_polygon(lat, lng, poly):
                            return json.dumps({
                                'status': 'success',
                                'speed_limit': zone['speed_limit'],
                                'source': 'osm'
                            })
                    except:
                        continue

        # 2. Fall back to state defaults
        defaults = DEFAULT_SPEED_LIMITS.get(state, DEFAULT_SPEED_LIMITS['DEFAULT'])
        category = 'urban'
        base_limit = defaults[category]
        
        adjustments = VEHICLE_LIMIT_ADJUSTMENTS.get(vehicle_type, VEHICLE_LIMIT_ADJUSTMENTS['car'])
        diff = adjustments[category]
        
        speed_limit = max(20, base_limit + diff)

        return json.dumps({
            'status': 'success',
            'speed_limit': speed_limit,
            'source': 'default'
        })
    except Exception as e:
        return json.dumps({'status': 'error', 'message': str(e)})
