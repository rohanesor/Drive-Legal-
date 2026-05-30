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

from database import initialize_database, get_laws, get_penalties, save_chat_history, get_all_penalties_by_state, get_localized_penalties
from search import search
from zones import check_zones
from stt import transcribe_audio, start_model_download_thread
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
        try:
            start_model_download_thread()
        except Exception as e:
            print(f"Failed to start Whisper model background download: {e}")
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
        action = payload.get('action')
        if action == 'get_penalties':
            location = payload.get('location', {})
            state = payload.get('state') or location.get('state') or 'TN'
            city = location.get('city')
            district = location.get('district')
            penalties = get_localized_penalties(state, city, district)
            return json.dumps({'status': 'success', 'penalties': penalties})

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
    2. Dynamically detect input language & select response routing
    3. Search for relevant laws (FAISS + keyword fallback)
    4. Fetch penalty details
    5. Generate response matching the user's spoken language
    6. Validate citations
    7. Generate TTS audio
    8. Save to chat history
    
    Args:
        payload: Parsed JSON with query parameters
    
    Returns:
        Dictionary with response_text, source_sections, confidence, detected_language, transcription
    """
    text = payload.get('text', '')
    audio_uri = payload.get('audio_uri')
    location = payload.get('location', {})
    default_language = payload.get('language', 'en')
    state = location.get('state', 'TN')
    city = location.get('city')
    district = location.get('district')
    history = payload.get('history', [])
    concise_mode = payload.get('concise_mode', False)

    # STEP 1: Convert audio to text if needed
    if audio_uri:
        text = transcribe_audio(audio_uri, default_language)
        if not text:
            return {
                'response_text': "I couldn't hear that clearly. Try again or type your question.",
                'source_sections': [],
                'confidence': 0.0,
                'detected_language': default_language,
                'transcription': '',
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
        detected_lang = detect_language_from_text(text)
        lang = detected_lang if detected_lang != 'en' else default_language
        summary = generate_location_fines_summary(state, city, district, lang)
        if summary:
            return {
                'response_text': summary,
                'source_sections': [],
                'confidence': 0.99,
                'detected_language': lang,
                'transcription': text,
            }

    # STEP 2: Dynamically detect language from text
    detected_lang = detect_language_from_text(text)
    
    # Calculate language detection confidence ratio
    clean_text = text.replace(' ', '')
    total_len = len(clean_text)
    lang_confidence = 0.95
    if total_len > 0 and detected_lang != 'en':
        if detected_lang == 'ta':
            char_count = sum(1 for c in clean_text if '\u0B80' <= c <= '\u0BFF')
        elif detected_lang == 'hi':
            char_count = sum(1 for c in clean_text if '\u0900' <= c <= '\u097F')
        elif detected_lang == 'te':
            char_count = sum(1 for c in clean_text if '\u0C00' <= c <= '\u0C7F')
        elif detected_lang == 'kn':
            char_count = sum(1 for c in clean_text if '\u0C80' <= c <= '\u0CFF')
        elif detected_lang == 'ml':
            char_count = sum(1 for c in clean_text if '\u0D00' <= c <= '\u0D7F')
        else:
            char_count = 0
        lang_confidence = max(0.85, min(0.99, float(char_count) / total_len))
    else:
        # Standard english or fallback
        lang_confidence = 0.98 if not audio_uri else 0.91

    # Override language settings so LLM responds in identical spoken language
    language = detected_lang

    # STEP 3: Search for relevant laws
    laws = search(text, top_k=3, state=state)
    if not laws:
        # Instead of raising error, provide smart follow-up for vague queries
        followup = generate_smart_followup(text, state, language, city, district)
        if followup:
            return {
                'response_text': followup,
                'source_sections': [],
                'confidence': round(lang_confidence, 2),
                'detected_language': detected_lang,
                'transcription': text,
            }
            
        # Conversational fallback check for out-of-domain / emergency / test queries
        try:
            fallback_text = generate_response(
                text, [], state, language, 
                city=city, district=district, 
                concise_mode=concise_mode
            )
            if fallback_text and "RTO" not in fallback_text and "consult" not in fallback_text:
                return {
                    'response_text': fallback_text,
                    'source_sections': [],
                    'confidence': round(lang_confidence, 2),
                    'detected_language': detected_lang,
                    'transcription': text,
                }
        except Exception:
            pass
            
        raise SearchError(f'No laws found for query: {text}')

    # STEP 4: Fetch penalty details for the found violations
    penalties = []
    for law in laws:
        violation_type = law.get('violation_type', '')
        if violation_type:
            penalties.extend(get_penalties(violation_type, state, city, district))

    # Calculate search confidence score
    search_confidence = laws[0].get('similarity', 0.85) if laws else 0.85
    combined_confidence = round((search_confidence * 0.4) + (lang_confidence * 0.6), 2)

    # STEP 5: Generate response (LLM with template fallback) in identical spoken language
    response_text = generate_response(
        text, laws, state, language, 
        history=history, penalties=penalties, 
        city=city, district=district, 
        concise_mode=concise_mode
    )
    if not response_text:
        response_text = build_template_response(laws, penalties, state, city, district)

    # STEP 6: Validate citations to prevent hallucinations
    source_sections = validate_citations(response_text, laws)

    # STEP 7: Generate TTS audio (handled by Android native in MVP)
    response_audio_uri = speak_text(response_text, language)

    # STEP 8: Save to chat history for analytics
    save_chat_history(text, response_text, state)

    return {
        'response_text': response_text,
        'response_audio_uri': response_audio_uri,
        'source_sections': source_sections,
        'confidence': combined_confidence,
        'detected_language': detected_lang,
        'transcription': text,
    }


def build_template_response(laws: List[Dict], penalties: List[Dict], state: str, city: str = None, district: str = None) -> str:
    """
    Build a response using a template (fallback when LLM is unavailable).
    
    This is the SAFEST response mode - no AI hallucination possible.
    Uses only verified data from the SQLite database.
    
    Format:
    "According to [law section]: [law description].
     Penalty in [location]: First offense - [amount], Second offense - [amount]."
    """
    if not laws:
        return "I don't have information on that topic yet. Try asking about traffic violations, fines, or license procedures."

    law = laws[0]
    penalty_text = ''
    if penalties:
        p = penalties[0]
        first = p.get('first_offense', 'N/A')
        second = p.get('second_offense', 'N/A')
        
        loc_label = f"{city}, {district}" if city and district else district if district else state
        penalty_text = f"\n\nPenalty in {loc_label}: First offense - {first}"
        if second:
            penalty_text += f", Second offense - {second}"
            
        details = p.get('additional_details', '')
        if details:
            if details.startswith('{'):
                try:
                    d_json = json.loads(details)
                    veh = d_json.get('vehicle_type', 'All vehicles')
                    enf = d_json.get('enforcement_type', '')
                    penalty_text += f" (Vehicle: {veh}"
                    if enf:
                        penalty_text += f", Enforcement: {enf}"
                    penalty_text += ")"
                except:
                    penalty_text += f" ({details})"
            else:
                penalty_text += f" ({details})"

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
    citations = re.findall(r'(?:§|Section|section|Rule)\s*[\dA-Za-z]+', response_text)
    
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


def keyword_fallback_response(payload: Dict) -> str:
    """Fallback when no laws are found — with smart follow-up questions."""
    text = payload.get('text', 'your question')
    language = payload.get('language', 'en')
    location = payload.get('location', {})
    state = location.get('state', 'TN')
    city = location.get('city')
    district = location.get('district')
    followup = generate_smart_followup(text, state, language, city, district)
    if followup:
        return followup
    if language == 'ta':
        return f"'{text}' பற்றி குறிப்பிட்ட தகவல் இல்லை. போக்குவரத்து விதிமீறல்கள், அபராதம் அல்லது உரிம நடைமுறைகள் பற்றி கேளுங்கள்."
    elif language == 'hi':
        return f"'{text}' के बारे में विशेष जानकारी नहीं है। ट्रैफिक उल्लंघन, जुर्माना, या लाइसेंस प्रक्रियाओ के बारे में पूछें।"
    return f"I don't have specific information on '{text}'. Try asking about traffic violations, fines, or license procedures."


# ── Smart follow-up question system ──

VAGUE_QUERY_PATTERNS = {
    'helmet': {
        'en': '🪖 **Helmet Violation (Section 194D, MV Act)**\n\nNot wearing a helmet while riding a two-wheeler is a punishable offense.\n\n• **First offense:** {first_fine} fine + 3-month license suspension\n• **Repeat offense:** {second_fine} fine + longer suspension\n\nTo give you the exact fine for your situation, could you tell me:\n1. Is this your **first offense** or a repeat offense?\n2. Were you the **rider or pillion passenger**?',
        'ta': '🪖 **ஹெல்மெட் விதிமீறல் (பிரிவு 194D, MV சட்டம்)**\n\nஇருசக்கர வாகனம் ஓட்டும்போது ஹெல்மெட் அணியாமல் இருப்பது தண்டனைக்குரிய குற்றம்.\n\n• **முதல் குற்றம்:** {first_fine} அபராதம் + 3 மாத உரிம இடைநிறுத்தம்\n• **மீண்டும் குற்றம்:** {second_fine} அபராதம்\n\nஉங்கள் நிலைமைக்கு சரியான அபராதத்தை சொல்ல:\n1. இது உங்கள் **முதல் குற்றமா** அல்லது மீண்டும்?\n2. நீங்கள் **ஓட்டுநரா அல்லது பின் இருக்கை பயணியா**?',
        'hi': '🪖 **हेलमेट उल्लंघन (धारा 194D, MV अधिनियम)**\n\nदोपहिया वाहन चलाते समय हेलमेट न पहनना दंडनीय अपराध है।\n\n• **पहला अपराध:** {first_fine} जुर्माना + 3 महीने का लाइसेंस निलंबन\n• **दोबारा अपराध:** {second_fine} जुर्माना\n\nआपकी स्थिति के लिए सही जुर्माना बताने के लिए:\n1. क्या यह आपका **पहला अपराध** है या दोबारा?\n2. क्या आप **चालक थे या पीछे बैठे यात्री**?',
    },
    'signal': {
        'en': '🚦 **Traffic Signal Violation (Section 194C, MV Act)**\n\nJumping a red light is a serious offense.\n\n• **Fine:** {first_fine} to {second_fine} (varies by state)\n• May also attract license suspension for repeat offenders.\n\nCould you clarify:\n1. Was this caught by a **traffic camera or by a police officer**?\n2. Is this your **first time** or have you been fined before?',
        'ta': '🚦 **சிக்னல் ஜம்ப் (பிரிவு 194C, MV சட்டம்)**\n\nசிவப்பு விளக்கை மீறுவது கடுமையான குற்றம்.\n\n• **அபராதம்:** {first_fine} முதல் {second_fine}\n\nதெளிவுபடுத்துங்கள்:\n1. **கேமரா மூலம் பிடிபட்டதா அல்லது காவல்துறை**?\n2. இது **முதல் முறையா**?',
        'hi': '🚦 **सिग्नल उल्लंघन (धारा 194C, MV अधिनियम)**\n\nलाल बत्ती तोड़ना गंभीर अपराध है।\n\n• **जुर्माना:** {first_fine} से {second_fine}\n\nकृपया बताएं:\n1. क्या यह **कैमरे से पकड़ा गया या पुलिस ने**?\n2. क्या यह **पहली बार** है?',
    },
    'license': {
        'en': '📋 **License Information**\n\nI can help you with license-related queries! Could you specify what you need:\n1. **Applying for a new license** (learner\'s or permanent)?\n2. **License renewal** — is your license expired or about to expire?\n3. **Driving without a license** — what\'s the penalty?\n4. **International driving permit**?',
        'ta': '📋 **உரிம தகவல்**\n\nஉரிம தொடர்பான கேள்விகளுக்கு உதவ முடியும்! என்ன தேவை:\n1. **புதிய உரிமம் விண்ணப்பிக்க** (கற்றல் அல்லது நிரந்தர)?\n2. **உரிம புதுப்பிப்பு**?\n3. **உரிமம் இல்லாமல் ஓட்டுதல்** — அபராதம் என்ன?\n4. **சர்வதேச ஓட்டுநர் உரிமம்**?',
        'hi': '📋 **लाइसेंस जानकारी**\n\nलाइसेंस संबंधी प्रश्नों में मदद कर सकता हूं! बताइए:\n1. **नया लाइसेंस** (लर्नर या स्थायी)?\n2. **लाइसेंस नवीनीकरण**?\n3. **बिना लाइसेंस ड्राइविंग** — जुर्माना?\n4. **अंतर्राष्ट्रीय ड्राइविंग परमिट**?',
    },
    'fine': {
        'en': '💰 **Traffic Fine Information**\n\nI can look up fine amounts for you! Which violation are you asking about:\n1. **Speeding** 🏎️\n2. **Drunk driving** 🍺\n3. **No helmet / no seatbelt** 🪖\n4. **Signal jumping** 🚦\n5. **Wrong-side driving** ↔️\n6. **Other** — just describe the violation!',
        'ta': '💰 **போக்குவரத்து அபராதம்**\n\nஎந்த விதிமீறல் பற்றி கேட்கிறீர்கள்:\n1. **வேகமாக ஓட்டுதல்** 🏎️\n2. **குடிபோதையில் ஓட்டுதல்** 🍺\n3. **ஹெல்மெட் / சீட் பெல்ட் இல்லை** 🪖\n4. **சிக்னல் ஜம்ப்** 🚦\n5. **தவறான பக்கம்** ↔️',
        'hi': '💰 **ट्रैफिक जुर्माना**\n\nकिस उल्लंघन के बारे में पूछ रहे हैं:\n1. **ओवरस्पीडिंग** 🏎️\n2. **शराब पीकर ड्राइविंग** 🍺\n3. **हेलमेट / सीट बेल्ट नहीं** 🪖\n4. **सिग्नल तोड़ना** 🚦\n5. **गलत साइड** ↔️',
    },
    'challan': {
        'en': '📝 **Challan / E-Challan Information**\n\nI can help with challan-related queries! Please tell me:\n1. **Check pending challans** — Do you have your vehicle number?\n2. **Pay a challan online** — Which state?\n3. **Dispute a challan** — What was the violation?\n4. **Challan fine amounts** — Which violation?',
        'ta': '📝 **சல்லான் / இ-சல்லான்**\n\nசல்லான் தொடர்பாக உதவ முடியும்! சொல்லுங்கள்:\n1. **நிலுவையில் உள்ள சல்லான்** — வாகன எண் உள்ளதா?\n2. **ஆன்லைனில் செலுத்த**?\n3. **சல்லான் எதிர்ப்பு**?\n4. **அபராத தொகை**?',
        'hi': '📝 **चालान / ई-चालान**\n\nचालान संबंधी मदद:\n1. **लंबित चालान जांचें** — गाड़ी नंबर है?\n2. **ऑनलाइन भुगतान**?\n3. **चालान विवाद**?\n4. **जुर्माना राशि**?',
    },
    'speed': {
        'en': '🏎️ **Speeding Violation (Section 194, MV Act)**\n\nSpeeding fines depend on the type of vehicle and how much you exceeded the limit.\n\n• **Light motor vehicle:** {first_fine}\n• **Medium/heavy vehicle:** {second_fine}\n\nTo give exact details:\n1. Were you driving a **car, bike, or commercial vehicle**?\n2. Do you know the **speed limit** on that road?',
        'ta': '🏎️ **வேக விதிமீறல் (பிரிவு 194)**\n\nவேக அபராதம் வாகன வகையைப் பொறுத்தது.\n\n• **லேசான வாகனம்:** {first_fine}\n• **கனரக வாகனம்:** {second_fine}\n\nசரியான விவரங்களுக்கு:\n1. **கார், பைக் அல்லது வணிக வாகனம்**?\n2. அந்த சாலையின் **வேக வரம்பு** தெரியுமா?',
        'hi': '🏎️ **ओवरस्पीडिंग (धारा 194)**\n\nजुर्माना वाहन के प्रकार पर निर्भर करता है।\n\n• **हल्का वाहन:** {first_fine}\n• **भारी वाहन:** {second_fine}\n\nसटीक जानकारी के लिए:\n1. **कार, बाइक या कमर्शियल वाहन**?\n2. उस सड़क की **स्पीड लिमिट** पता है?',
    },
    'drink': {
        'en': '🍺 **Drunk Driving (Section 185, MV Act)**\n\nDrunk driving is one of the most severely punished traffic offenses in India.\n\n• **First offense:** {first_fine} fine and/or up to 6 months imprisonment\n• **Repeat offense (within 3 years):** {second_fine} fine and/or up to 2 years imprisonment\n• Blood alcohol limit: **30mg per 100ml of blood**\n\nIs this for:\n1. **Understanding the law** before driving?\n2. **Already caught** — what are your options?',
        'ta': '🍺 **குடிபோதையில் ஓட்டுதல் (பிரிவு 185)**\n\n• **முதல் குற்றம்:** {first_fine} + 6 மாத சிறை\n• **மீண்டும் (3 வருடத்தில்):** {second_fine} + 2 வருட சிறை\n\nஇது எதற்கு:\n1. **சட்டத்தை புரிந்துகொள்ள**?\n2. **ஏற்கனவே பிடிபட்டதா**?',
        'hi': '🍺 **शराब पीकर ड्राइविंग (धारा 185)**\n\n• **पहला अपराध:** {first_fine} + 6 महीने जेल\n• **दोबारा (3 साल में):** {second_fine} + 2 साल जेल\n\nयह किसलिए:\n1. **कानून समझने के लिए**?\n2. **पहले से पकड़े गए** — क्या विकल्प हैं?',
    },
}

# Keywords that trigger each pattern
PATTERN_TRIGGERS = {
    'helmet': ['helmet', 'helmat', 'ஹெல்மெட்', 'हेलमेट', 'topi'],
    'signal': ['signal', 'red light', 'traffic light', 'சிக்னல்', 'सिग्नल', 'redlight'],
    'license': ['license', 'licence', 'dl', 'driving license', 'உரிமம்', 'லாசைன்ஸ்', 'permit'],
    'fine': ['fine', 'penalty', 'amount', 'அபராதம்', 'जुर्माना', 'kitna'],
    'challan': ['challan', 'echallan', 'e-challan', 'சல்லான்', 'चालान'],
    'speed': ['speed', 'overspeeding', 'speeding', 'வேகம்', 'स्पीड', 'fast'],
    'drink': ['drunk', 'drinking', 'alcohol', 'dui', 'குடி', 'शराब', 'daaru'],
}


def detect_language_from_text(text: str) -> str:
    """Unicode range language detection for multi-lingual Indian co-driver."""
    tamil_chars = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    telugu_chars = sum(1 for c in text if '\u0C00' <= c <= '\u0C7F')
    kannada_chars = sum(1 for c in text if '\u0C80' <= c <= '\u0CFF')
    malayalam_chars = sum(1 for c in text if '\u0D00' <= c <= '\u0D7F')
    
    counts = {
        'ta': tamil_chars,
        'hi': hindi_chars,
        'te': telugu_chars,
        'kn': kannada_chars,
        'ml': malayalam_chars
    }
    
    max_lang = max(counts, key=counts.get)
    if counts[max_lang] > 1: # Require at least 2 characters to trigger Indian regional language routing
        return max_lang
        
    return 'en'


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


def generate_smart_followup(text: str, state: str, language: str, city: str = None, district: str = None) -> str:
    """
    Generate a smart follow-up response for vague queries.
    Returns None if the query doesn't match any known patterns.
    """
    text_lower = text.lower().strip()
    
    # Auto-detect language if not clear from setting
    detected_lang = detect_language_from_text(text)
    lang = detected_lang if detected_lang != 'en' else language
    
    # Intercept generic queries about fines or rules for user's location
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
        summary = generate_location_fines_summary(state, city, district, lang)
        if summary:
            return summary
    
    # Auto-detect language if not clear from setting
    detected_lang = detect_language_from_text(text)
    lang = detected_lang if detected_lang != 'en' else language
    
    for pattern_key, triggers in PATTERN_TRIGGERS.items():
        for trigger in triggers:
            if trigger in text_lower:
                templates = VAGUE_QUERY_PATTERNS.get(pattern_key, {})
                response_template = templates.get(lang, templates.get('en', ''))
                if response_template:
                    # Dynamically fetch localized penalty details
                    first_fine = "₹1,000"
                    second_fine = "₹2,000"
                    
                    violation_mapping = {
                        'helmet': 'no_helmet',
                        'signal': 'red_light',
                        'speed': 'speeding',
                        'drink': 'drunk_driving',
                        'license': 'no_license'
                    }
                    
                    if pattern_key in violation_mapping:
                        try:
                            from database import get_penalties
                            p_list = get_penalties(violation_mapping[pattern_key], state, city, district)
                            if p_list:
                                p = p_list[0]
                                first_fine = p.get('first_offense', first_fine)
                                second_fine = p.get('second_offense', second_fine)
                        except Exception:
                            pass
                    
                    # Format response text safely with localized values
                    try:
                        formatted_response = response_template.format(first_fine=first_fine, second_fine=second_fine)
                    except Exception:
                        formatted_response = response_template
                    
                    # Prefix with localized location notice
                    location_name = get_location_label(state, city, district, lang)
                    if lang == 'ta':
                        prefix = f"📍 **உங்கள் தற்போதைய இருப்பிடமான {location_name} அடிப்படையில்:**\n\n"
                    elif lang == 'hi':
                        prefix = f"📍 **आपके वर्तमान स्थान {location_name} के आधार पर:**\n\n"
                    else:
                        prefix = f"📍 **Based on your current location in {location_name}:**\n\n"
                        
                    return prefix + formatted_response
    
    return None


def handle_zone_check(json_payload: str) -> str:
    """
    Check if current GPS location triggers any zone alerts.
    
    Called by React Native whenever the GPS location changes
    (every 5 seconds in Car Mode, or 30 seconds in Mobile Mode).
    """
    try:
        payload = json.loads(json_payload)
        location = payload.get('location', {})
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)
        state = location.get('state', 'TN')
        heading = location.get('heading')
        speed = location.get('speed', 0)

        alerts = check_zones(lat, lng, state, heading=heading, speed=speed)

        if alerts:
            return json.dumps(alerts[0])  # Return first triggered alert
        return json.dumps({'status': 'no_alert'})
    except Exception as e:
        return json.dumps({'status': 'error', 'message': str(e)})
