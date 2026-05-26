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


def execute_pipeline(payload: Dict) -> Dict:
    text = payload.get('text', '')
    audio_uri = payload.get('audio_uri')
    location = payload.get('location', {})
    language = payload.get('language', 'en')
    state = location.get('state', 'TN')
    lat = location.get('lat', 0)
    history = payload.get('history', [])

    has_gps = lat != 0

    if audio_uri:
        text = transcribe_audio(audio_uri, language)
        if not text:
            return {'response_text': 'I couldn\'t hear you clearly. Could you repeat that or type it?', 'confidence': 0}

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
