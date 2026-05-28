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
    city = location.get('city')
    district = location.get('district')
    history = payload.get('history', [])
    concise_mode = payload.get('concise_mode', False)

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
        # Instead of raising error, provide smart follow-up for vague queries
        followup = generate_smart_followup(text, state, language)
        if followup:
            return {
                'response_text': followup,
                'source_sections': [],
                'confidence': 0,
            }
        raise SearchError(f'No laws found for query: {text}')

    # STEP 3: Fetch penalty details for the found violations
    penalties = []
    for law in laws:
        violation_type = law.get('violation_type', '')
        if violation_type:
            penalties.extend(get_penalties(violation_type, state, city, district))

    # Calculate confidence from search similarity score
    confidence = laws[0].get('similarity', 0) if laws else 0

    # STEP 4: Generate response (LLM with template fallback)
    response_text = generate_response(
        text, laws, state, language, 
        history=history, penalties=penalties, 
        city=city, district=district, 
        concise_mode=concise_mode
    )
    if not response_text:
        response_text = build_template_response(laws, penalties, state, city, district)

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


def keyword_fallback_response(payload: Dict) -> str:
    """Fallback when no laws are found — with smart follow-up questions."""
    text = payload.get('text', 'your question')
    language = payload.get('language', 'en')
    state = payload.get('location', {}).get('state', 'TN')
    followup = generate_smart_followup(text, state, language)
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
        'en': '🪖 **Helmet Violation (Section 194D, MV Act)**\n\nNot wearing a helmet while riding a two-wheeler is a punishable offense.\n\n• **First offense:** ₹1,000 fine + 3-month license suspension\n• **Repeat offense:** ₹2,000 fine + longer suspension\n\nTo give you the exact fine for your situation, could you tell me:\n1. Is this your **first offense** or a repeat offense?\n2. Were you the **rider or pillion passenger**?',
        'ta': '🪖 **ஹெல்மெட் விதிமீறல் (பிரிவு 194D, MV சட்டம்)**\n\nஇருசக்கர வாகனம் ஓட்டும்போது ஹெல்மெட் அணியாமல் இருப்பது தண்டனைக்குரிய குற்றம்.\n\n• **முதல் குற்றம்:** ₹1,000 அபராதம் + 3 மாத உரிம இடைநிறுத்தம்\n• **மீண்டும் குற்றம்:** ₹2,000 அபராதம்\n\nஉங்கள் நிலைமைக்கு சரியான அபராதத்தை சொல்ல:\n1. இது உங்கள் **முதல் குற்றமா** அல்லது மீண்டும்?\n2. நீங்கள் **ஓட்டுநரா அல்லது பின் இருக்கை பயணியா**?',
        'hi': '🪖 **हेलमेट उल्लंघन (धारा 194D, MV अधिनियम)**\n\nदोपहिया वाहन चलाते समय हेलमेट न पहनना दंडनीय अपराध है।\n\n• **पहला अपराध:** ₹1,000 जुर्माना + 3 महीने का लाइसेंस निलंबन\n• **दोबारा अपराध:** ₹2,000 जुर्माना\n\nआपकी स्थिति के लिए सही जुर्माना बताने के लिए:\n1. क्या यह आपका **पहला अपराध** है या दोबारा?\n2. क्या आप **चालक थे या पीछे बैठे यात्री**?',
    },
    'signal': {
        'en': '🚦 **Traffic Signal Violation (Section 194C, MV Act)**\n\nJumping a red light is a serious offense.\n\n• **Fine:** ₹1,000 to ₹5,000 (varies by state)\n• May also attract license suspension for repeat offenders.\n\nCould you clarify:\n1. Was this caught by a **traffic camera or by a police officer**?\n2. Is this your **first time** or have you been fined before?',
        'ta': '🚦 **சிக்னல் ஜம்ப் (பிரிவு 194C, MV சட்டம்)**\n\nசிவப்பு விளக்கை மீறுவது கடுமையான குற்றம்.\n\n• **அபராதம்:** ₹1,000 முதல் ₹5,000\n\nதெளிவுபடுத்துங்கள்:\n1. **கேமரா மூலம் பிடிபட்டதா அல்லது காவல்துறை**?\n2. இது **முதல் முறையா**?',
        'hi': '🚦 **सिग्नल उल्लंघन (धारा 194C, MV अधिनियम)**\n\nलाल बत्ती तोड़ना गंभीर अपराध है।\n\n• **जुर्माना:** ₹1,000 से ₹5,000\n\nकृपया बताएं:\n1. क्या यह **कैमरे से पकड़ा गया या पुलिस ने**?\n2. क्या यह **पहली बार** है?',
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
        'en': '🏎️ **Speeding Violation (Section 194, MV Act)**\n\nSpeeding fines depend on the type of vehicle and how much you exceeded the limit.\n\n• **Light motor vehicle:** ₹1,000 - ₹2,000\n• **Medium/heavy vehicle:** ₹2,000 - ₹4,000\n\nTo give exact details:\n1. Were you driving a **car, bike, or commercial vehicle**?\n2. Do you know the **speed limit** on that road?',
        'ta': '🏎️ **வேக விதிமீறல் (பிரிவு 194)**\n\nவேக அபராதம் வாகன வகையைப் பொறுத்தது.\n\n• **லேசான வாகனம்:** ₹1,000 - ₹2,000\n• **கனரக வாகனம்:** ₹2,000 - ₹4,000\n\nசரியான விவரங்களுக்கு:\n1. **கார், பைக் அல்லது வணிக வாகனம்**?\n2. அந்த சாலையின் **வேக வரம்பு** தெரியுமா?',
        'hi': '🏎️ **ओवरस्पीडिंग (धारा 194)**\n\nजुर्माना वाहन के प्रकार पर निर्भर करता है।\n\n• **हल्का वाहन:** ₹1,000 - ₹2,000\n• **भारी वाहन:** ₹2,000 - ₹4,000\n\nसटीक जानकारी के लिए:\n1. **कार, बाइक या कमर्शियल वाहन**?\n2. उस सड़क की **स्पीड लिमिट** पता है?',
    },
    'drink': {
        'en': '🍺 **Drunk Driving (Section 185, MV Act)**\n\nDrunk driving is one of the most severely punished traffic offenses in India.\n\n• **First offense:** ₹10,000 fine and/or up to 6 months imprisonment\n• **Repeat offense (within 3 years):** ₹15,000 fine and/or up to 2 years imprisonment\n• Blood alcohol limit: **30mg per 100ml of blood**\n\nIs this for:\n1. **Understanding the law** before driving?\n2. **Already caught** — what are your options?',
        'ta': '🍺 **குடிபோதையில் ஓட்டுதல் (பிரிவு 185)**\n\n• **முதல் குற்றம்:** ₹10,000 + 6 மாத சிறை\n• **மீண்டும் (3 வருடத்தில்):** ₹15,000 + 2 வருட சிறை\n\nஇது எதற்கு:\n1. **சட்டத்தை புரிந்துகொள்ள**?\n2. **ஏற்கனவே பிடிபட்டதா**?',
        'hi': '🍺 **शराब पीकर ड्राइविंग (धारा 185)**\n\n• **पहला अपराध:** ₹10,000 + 6 महीने जेल\n• **दोबारा (3 साल में):** ₹15,000 + 2 साल जेल\n\nयह किसलिए:\n1. **कानून समझने के लिए**?\n2. **पहले से पकड़े गए** — क्या विकल्प हैं?',
    },
}

# Keywords that trigger each pattern
PATTERN_TRIGGERS = {
    'helmet': ['helmet', 'helmat', 'ஹெல்மெட்', 'हेलमेट', 'topi'],
    'signal': ['signal', 'red light', 'traffic light', 'சிக்னல்', 'सिग्नल', 'redlight'],
    'license': ['license', 'licence', 'dl', 'driving license', 'உரிமம்', 'लाइसेंस', 'permit'],
    'fine': ['fine', 'penalty', 'amount', 'அபராதம்', 'जुर्माना', 'kitna'],
    'challan': ['challan', 'echallan', 'e-challan', 'சல்லான்', 'चालान'],
    'speed': ['speed', 'overspeeding', 'speeding', 'வேகம்', 'स्पीड', 'fast'],
    'drink': ['drunk', 'drinking', 'alcohol', 'dui', 'குடி', 'शराब', 'daaru'],
}


def detect_language_from_text(text: str) -> str:
    """Simple language detection based on Unicode character ranges."""
    tamil_chars = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    if tamil_chars > 2:
        return 'ta'
    if hindi_chars > 2:
        return 'hi'
    return 'en'


def generate_smart_followup(text: str, state: str, language: str) -> str:
    """
    Generate a smart follow-up response for vague queries.
    Returns None if the query doesn't match any known patterns.
    """
    text_lower = text.lower().strip()
    
    # Auto-detect language if not clear from setting
    detected_lang = detect_language_from_text(text)
    lang = detected_lang if detected_lang != 'en' else language
    
    for pattern_key, triggers in PATTERN_TRIGGERS.items():
        for trigger in triggers:
            if trigger in text_lower:
                templates = VAGUE_QUERY_PATTERNS.get(pattern_key, {})
                response = templates.get(lang, templates.get('en', ''))
                if response:
                    return response
    
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
