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

# Model file location
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'tinyllama-1.1b-q4.gguf')
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
) -> Optional[str]:
    """
    Generate a response using TinyLlama with law context.
    
    Args:
        prompt: User's question
        laws: Retrieved law dictionaries from FAISS search
        state: User's state code
        language: Response language
        max_tokens: Maximum response length
    
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

    # Build the system prompt with instructions
    system_prompt = f"""You are DriveLegal, an expert on Indian traffic laws.
User's State: {state}
Language: {language}

Relevant Laws:
{laws_text}

Rules:
- Always cite the relevant section of the Motor Vehicles Act
- Provide state-specific penalty amounts
- Explain procedures clearly
- Be concise and actionable
- If unsure, say "I recommend checking with your local RTO"
- Respond in the same language as the user"""

    # Format as TinyLlama chat template
    full_prompt = f"<|system|>\n{system_prompt}</s>\n<|user|>\n{prompt}</s>\n<|assistant|>\n"

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
