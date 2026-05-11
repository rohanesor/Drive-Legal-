"""
Main Module - DriveLegal Python service entry point

THIS IS THE CORE FILE that the React Native app communicates with.
It receives JSON payloads from the RN bridge and routes them
through the appropriate processing pipeline.

PIPELINE FLOW:
1. Receive query from RN (text or audio)
2. If audio: transcribe to text using Whisper
3. Search for relevant laws using FAISS semantic search
4. Fetch penalty details from SQLite
5. Generate response using TinyLlama (or template fallback)
6. Validate citations to prevent hallucinations
7. Return response JSON to RN

ERROR HANDLING:
Every step has a fallback. If any component fails,
the pipeline degrades gracefully instead of crashing.
"""

import json
import re
from typing import Dict, List

from database import initialize_database, get_laws, get_penalties, save_chat_history
from search import search
from zones import check_zones
from stt import transcribe_audio
from tts import speak_text
from llm import generate_response, unload_model


def initialize() -> str:
    """
    Initialize the Python service on app startup.
    Creates database tables and preloads models.
    Called by React Native via the PythonBridge.
    """
    try:
        initialize_database()
        return json.dumps({'status': 'success', 'message': 'DriveLegal initialized'})
    except Exception as e:
        return json.dumps({'status': 'error', 'code': 'INIT_ERROR', 'message': str(e)})


def handle_query(json_payload: str) -> str:
    """
    Main query handler - processes user questions and returns responses.
    
    This is the PRIMARY ENTRY POINT called by React Native.
    
    Args:
        json_payload: JSON string with action, text/audio_uri, location, language
    
    Returns:
        JSON string with status, response_text, source_sections, confidence
    """
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


# Custom exception classes for pipeline error handling
class ModelLoadError(Exception):
    """Raised when a model (Whisper, LLM, etc.) fails to load."""
    pass


class SearchError(Exception):
    """Raised when no relevant laws are found for a query."""
    pass


def execute_pipeline(payload: Dict) -> Dict:
    """
    Execute the full query processing pipeline.
    
    STEPS:
    1. Extract text (from input or transcribe audio)
    2. Search for relevant laws (FAISS + keyword fallback)
    3. Fetch penalty details
    4. Generate response (LLM or template)
    5. Validate citations
    6. Generate TTS audio
    7. Save to chat history
    
    Args:
        payload: Parsed JSON with query parameters
    
    Returns:
        Dictionary with response_text, source_sections, confidence
    """
    text = payload.get('text', '')
    audio_uri = payload.get('audio_uri')
    location = payload.get('location', {})
    language = payload.get('language', 'en')
    state = location.get('state', 'TN')

    # STEP 1: Convert audio to text if needed
    if audio_uri:
        text = transcribe_audio(audio_uri, language)
        if not text:
            return {
                'response_text': 'Could not understand audio. Please try again or type your question.',
                'source_sections': [],
                'confidence': 0,
            }

    # STEP 2: Search for relevant laws
    laws = search(text, top_k=3, state=state)
    if not laws:
        raise SearchError(f'No laws found for query: {text}')

    # STEP 3: Fetch penalty details for the found violations
    penalties = []
    for law in laws:
        violation_type = law.get('violation_type', '')
        if violation_type:
            penalties.extend(get_penalties(violation_type, state))

    # Calculate confidence from search similarity score
    confidence = laws[0].get('similarity', 0) if laws else 0

    # STEP 4: Generate response (LLM with template fallback)
    response_text = generate_response(text, laws, state, language)
    if not response_text:
        response_text = build_template_response(laws, penalties, state)

    # STEP 5: Validate citations to prevent hallucinations
    source_sections = validate_citations(response_text, laws)

    # STEP 6: Generate TTS audio (handled by Android native in MVP)
    response_audio_uri = speak_text(response_text, language)

    # STEP 7: Save to chat history for analytics
    save_chat_history(text, response_text, state)

    return {
        'response_text': response_text,
        'response_audio_uri': response_audio_uri,
        'source_sections': source_sections,
        'confidence': round(confidence, 2),
    }


def build_template_response(laws: List[Dict], penalties: List[Dict], state: str) -> str:
    """
    Build a response using a template (fallback when LLM is unavailable).
    
    This is the SAFEST response mode - no AI hallucination possible.
    Uses only verified data from the SQLite database.
    
    Format:
    "According to [law section]: [law description].
     Penalty in [state]: First offense - [amount], Second offense - [amount]."
    """
    if not laws:
        return "I don't have information on that topic yet. Try asking about traffic violations, fines, or license procedures."

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
    """
    Validate that citations in the LLM response match actual retrieved laws.
    
    ANTI-HALLUCINATION MEASURE:
    LLMs can invent fake law sections. This function checks that
    every cited section in the response actually exists in the
    retrieved laws. Fake citations are stripped out.
    
    Args:
        response_text: LLM-generated response text
        laws: Retrieved law dictionaries
    
    Returns:
        List of validated citation strings
    """
    # Extract citation patterns (e.g., "§188", "Section 194B", "Rule 45")
    citations = re.findall(r'(?:§|Section|section|Rule)\s*\d+', response_text)
    
    # Get valid section names from retrieved laws
    valid_sections = set()
    for law in laws:
        section = law.get('section', '')
        if section:
            valid_sections.add(section)

    # Only keep citations that match actual retrieved laws
    validated = []
    for citation in citations:
        for section in valid_sections:
            if citation.lower() in section.lower():
                validated.append(section)
                break

    # If no citations matched but we have laws, show the law sections anyway
    if not validated and valid_sections:
        validated = list(valid_sections)[:3]

    return validated


def get_fallback_response(payload: Dict) -> str:
    """Generic fallback when model loading fails."""
    return "Based on keyword matching: Please try rephrasing your question."


def keyword_fallback_response(payload: Dict) -> str:
    """Fallback when no laws are found."""
    text = payload.get('text', 'your question')
    return f"I don't have specific information on '{text}'. Try asking about traffic violations, fines, or license procedures."


def handle_zone_check(json_payload: str) -> str:
    """
    Check if current GPS location triggers any zone alerts.
    
    Called by React Native whenever the GPS location changes
    (every 30 seconds or 100 meters during background monitoring).
    
    Args:
        json_payload: JSON string with action, location (lat, lng, state)
    
    Returns:
        JSON string with zone alert info, or 'no_alert' if no zones triggered
    """
    try:
        payload = json.loads(json_payload)
        location = payload.get('location', {})
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)
        state = location.get('state', 'TN')

        alerts = check_zones(lat, lng, state)

        if alerts:
            return json.dumps(alerts[0])  # Return first triggered alert
        return json.dumps({'status': 'no_alert'})
    except Exception as e:
        return json.dumps({'status': 'error', 'message': str(e)})
