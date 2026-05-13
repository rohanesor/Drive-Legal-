import json
import re
from typing import Dict, List

from database import initialize_database, get_laws, get_penalties, save_chat_history
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
        
        # Trigger real-time data sync on app launch
        sync_result = sync_on_app_launch()
        
        return json.dumps({
            'status': 'success',
            'message': 'DriveLegal initialized',
            'sync': sync_result
        })
    except Exception as e:
        return json.dumps({
            'status': 'error',
            'code': 'INIT_ERROR',
            'message': str(e)
        })


def handle_query(json_payload: str) -> str:
    try:
        payload = json.loads(json_payload)
        result = execute_pipeline(payload)
        return json.dumps({'status': 'success', **result})
    except ModelLoadError as e:
        payload = json.loads(json_payload) if isinstance(json_payload, str) else {}
        return json.dumps({
            'status': 'error',
            'code': 'MODEL_LOAD_FAILED',
            'message': str(e),
            'fallback_available': True,
            'fallback_response_text': get_fallback_response(payload)
        })
    except SearchError as e:
        payload = json.loads(json_payload) if isinstance(json_payload, str) else {}
        return json.dumps({
            'status': 'error',
            'code': 'SEARCH_FAILED',
            'message': str(e),
            'fallback_available': True,
            'fallback_response_text': keyword_fallback_response(payload)
        })
    except Exception as e:
        return json.dumps({
            'status': 'error',
            'code': 'UNKNOWN_ERROR',
            'message': str(e),
            'fallback_available': False
        })


class ModelLoadError(Exception):
    pass


class SearchError(Exception):
    pass


def execute_pipeline(payload: Dict) -> Dict:
    text = payload.get('text', '')
    audio_uri = payload.get('audio_uri')
    location = payload.get('location', {})
    language = payload.get('language', 'en')
    state = location.get('state', 'TN')

    if audio_uri:
        text = transcribe_audio(audio_uri, language)
        if not text:
            return {
                'response_text': 'Could not understand audio. Please try again or type your question.',
                'source_sections': [],
                'confidence': 0,
            }

    laws = search(text, top_k=3, state=state)
    if not laws:
        raise SearchError(f'No laws found for query: {text}')

    penalties = []
    for law in laws:
        violation_type = law.get('violation_type', '')
        if violation_type:
            penalties.extend(get_penalties(violation_type, state))

    confidence = laws[0].get('similarity', 0) if laws else 0

    response_text = generate_response(text, laws, state, language)
    if not response_text:
        response_text = build_template_response(laws, penalties, state)

    source_sections = validate_citations(response_text, laws)
    response_audio_uri = speak_text(response_text, language)

    save_chat_history(text, response_text, state)

    # Enrich with real-time data context
    enriched = get_enriched_response(text, laws, state, language)

    return {
        'response_text': response_text,
        'response_audio_uri': response_audio_uri,
        'source_sections': source_sections,
        'confidence': round(confidence, 2),
        'real_time_alerts': enriched.get('real_time_context', {}).get('alerts', []),
        'amendments': enriched.get('search_results', [{}])[0].get('amendments', []),
        'disclaimer': enriched.get('disclaimer', '')
    }


def build_template_response(laws: List[Dict], penalties: List[Dict], state: str) -> str:
    if not laws:
        return "I don't have information on that topic yet. Try asking about traffic violations, fines, or procedures."

    law = laws[0]
    penalty_text = ''
    if penalties:
        p = penalties[0]
        first = p.get('first_offense', 'N/A')
        second = p.get('second_offense', 'N/A')
        penalty_text = f"\n\nPenalty in {state}: First offense - {first}, Second offense - {second}."
        if p.get('additional_details'):
            penalty_text += f" {p['additional_details']}"

    return f"According to {law.get('section', 'the Motor Vehicles Act')}: {law.get('description', '')}.{penalty_text}"


def validate_citations(response_text: str, laws: List[Dict]) -> List[str]:
    citations = re.findall(r'(?:§|Section|section|Rule)\s*\d+', response_text)
    valid_sections = set()
    for law in laws:
        section = law.get('section', '')
        if section:
            valid_sections.add(section)

    validated = []
    for citation in citations:
        for section in valid_sections:
            if citation.lower() in section.lower():
                validated.append(section)
                break

    if not validated and valid_sections:
        validated = list(valid_sections)[:3]

    return validated


def get_fallback_response(payload: Dict) -> str:
    return "Based on keyword matching: Please try rephrasing your question."


def keyword_fallback_response(payload: Dict) -> str:
    text = payload.get('text', 'your question')
    return f"I don't have specific information on '{text}'. Try asking about traffic violations, fines, or license procedures."


def handle_zone_check(json_payload: str) -> str:
    try:
        payload = json.loads(json_payload)
        location = payload.get('location', {})
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)
        state = location.get('state', 'TN')

        alerts = check_zones(lat, lng, state)

        if alerts:
            return json.dumps(alerts[0])
        return json.dumps({'status': 'no_alert'})
    except Exception as e:
        return json.dumps({'status': 'error', 'message': str(e)})
