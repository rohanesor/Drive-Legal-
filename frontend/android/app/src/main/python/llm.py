"""
LLM Module - TinyLlama response generation

PURPOSE:
Generates natural language responses to user queries using the
retrieved law context. This is the "AI" part of the chatbot.

MODEL:
- TinyLlama 1.1B Chat v1.0 (quantized to Q4_K_M = ~600MB)
- Runs via llama.cpp (compiled for Android ARM64)
- Context window: 2048 tokens

HOW IT WORKS:
1. Retrieved laws are formatted into a system prompt
2. User's question is appended as the user message
3. TinyLlama generates a response using the law context
4. Response is returned to the query pipeline

MEMORY MANAGEMENT:
- Model is loaded only when needed (lazy loading)
- Model is unloaded after response generation
- This keeps peak memory usage manageable on 2GB+ RAM devices

FALLBACK:
If the LLM fails to load or generates empty/garbage output,
the pipeline falls back to template-based responses.
"""

import os
from typing import Optional, List, Dict

# Helper to find models dynamically, allowing fallback to writable files directory
def get_model_path(relative_path: str) -> str:
    # 1. Check writable files directory (plenty of space, avoids APK bloat)
    fallback_path = os.path.join('/data/data/com.drivelegal/files', relative_path)
    if os.path.exists(fallback_path):
        return fallback_path
    # 2. Check packaged JNI assets
    return os.path.join(os.path.dirname(__file__), relative_path)

# Model file location
MODEL_PATH = get_model_path(os.path.join('models', 'tinyllama-1.1b-q4.gguf'))
_model = None


def _load_model():
    """
    Load the TinyLlama model (lazy-loaded on first query).
    
    Tries two methods:
    1. llama-cpp-python (preferred, Python binding for llama.cpp)
    2. Direct ctypes binding to libllama.so (fallback)
    """
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        try:
            # Try llama-cpp-python first (easier to use)
            from llama_cpp import Llama
            _model = Llama(
                model_path=MODEL_PATH,
                n_ctx=2048,       # Context window size
                n_threads=4,      # CPU threads for inference
                n_gpu_layers=0,   # 0 = CPU only (no GPU on most Android)
                verbose=False,    # Suppress loading messages
            )
        except ImportError:
            # Fallback: try direct ctypes binding
            try:
                import ctypes
                llama_lib = os.path.join(os.path.dirname(__file__), 'models', 'libllama.so')
                if os.path.exists(llama_lib):
                    _model = ctypes.CDLL(llama_lib)
                else:
                    _model = None
            except Exception:
                _model = None
    return _model


def unload_model():
    """Free model memory after response generation."""
    global _model
    _model = None


def generate_response(
    prompt: str,
    laws: List[Dict],
    state: str,
    language: str,
    max_tokens: int = 256,
    history: List[Dict] = None,
    penalties: List[Dict] = None,
    city: str = None,
    district: str = None,
) -> Optional[str]:
    """
    Generate a response using TinyLlama with law context.
    
    Args:
        prompt: User's question
        laws: Retrieved law dictionaries from FAISS search
        state: User's state code
        language: Response language
        max_tokens: Maximum response length
        history: Previous chat turns context
        penalties: Retrieved penalty details
        city: Geocoded city or taluk name
        district: Geocoded district name
    
    Returns:
        Generated response text, or None if LLM unavailable
    """
    model = _load_model()
    if model is None:
        return None

    # Format retrieved laws into the system prompt
    laws_text = '\n\n'.join([
        f"- {law.get('section', 'Unknown')}: {law.get('description', '')}"
        for law in laws
    ])

    import json
    penalties_text = ""
    if penalties:
        pen_entries = []
        for p in penalties:
            first = p.get('first_offense', 'N/A')
            second = p.get('second_offense', '')
            details = p.get('additional_details', '')
            sec = p.get('section', '')
            
            p_text = f"- Section {sec}: First offense - {first}"
            if second:
                p_text += f", Repeat offense - {second}"
            if details:
                if details.startswith('{'):
                    try:
                        d_json = json.loads(details)
                        veh = d_json.get('vehicle_type', 'All vehicles')
                        enf = d_json.get('enforcement_type', '')
                        p_text += f" (Vehicle: {veh}"
                        if enf:
                            p_text += f", Enforcement: {enf}"
                        p_text += ")"
                    except:
                        p_text += f" ({details})"
                else:
                    p_text += f" ({details})"
            pen_entries.append(p_text)
        penalties_text = "\n".join(pen_entries)

    # Build the system prompt with instructions
    location_details = f"{city}, {district}, {state}" if city and district else district if district else state
    system_prompt = f"""You are TrafiAI (DriveLegal), an expert Indian traffic law assistant.
User's Location: {location_details}
Language preference: {language}

Relevant Laws:
{laws_text}

Specific Fine Amounts for user's location:
{penalties_text}

Rules:
- CRITICAL: Auto-detect the user's language. Reply in the SAME language they used.
  - Tamil input → Tamil response
  - Hindi input → Hindi response
  - English input → English response
  - Mixed language → match their dominant language
- Always cite the relevant section of the Motor Vehicles Act
- State-Specific and Localized Penalties: Quote the localized fine amounts for the user's location exactly as provided in the Fine Amounts section above. Prioritize city/taluk rules over general state/national rules.
- If the query is vague, give a brief answer AND ask 1-2 follow-up questions
- Be conversational, friendly, and helpful
- If unsure, say "I recommend checking with your local RTO"
"""

    # Format previous conversation history turns
    history_text = ""
    if history:
        for turn in history:
            role = "user" if turn.get('role') == 'user' else "assistant"
            content = turn.get('content', '')
            history_text += f"<|{role}|>\n{content}</s>\n"

    # Format as TinyLlama chat template incorporating prior history
    full_prompt = f"<|system|>\n{system_prompt}</s>\n{history_text}<|user|>\n{prompt}</s>\n<|assistant|>\n"

    try:
        from llama_cpp import Llama
        if isinstance(model, Llama):
            output = model(
                full_prompt,
                max_tokens=max_tokens,
                temperature=0.3,     # Low temperature for factual responses
                stop=['</s>', '<|user|>'],  # Stop tokens
                echo=False,
            )
            return output['choices'][0]['text'].strip()
    except Exception:
        pass

    return None
