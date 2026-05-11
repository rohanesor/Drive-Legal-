import os
from typing import Optional, List, Dict

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'tinyllama-1.1b-q4.gguf')
_model = None


def _load_model():
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        try:
            from llama_cpp import Llama
            _model = Llama(
                model_path=MODEL_PATH,
                n_ctx=2048,
                n_threads=4,
                n_gpu_layers=0,
                verbose=False,
            )
        except ImportError:
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
    global _model
    _model = None


def generate_response(
    prompt: str,
    laws: List[Dict],
    state: str,
    language: str,
    max_tokens: int = 256,
) -> Optional[str]:
    model = _load_model()
    if model is None:
        return None

    laws_text = '\n\n'.join([
        f"- {law.get('section', 'Unknown')}: {law.get('description', '')}"
        for law in laws
    ])

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

    full_prompt = f"<|system|>\n{system_prompt}</s>\n<|user|>\n{prompt}</s>\n<|assistant|>\n"

    try:
        from llama_cpp import Llama
        if isinstance(model, Llama):
            output = model(
                full_prompt,
                max_tokens=max_tokens,
                temperature=0.3,
                stop=['</s>', '<|user|>'],
                echo=False,
            )
            return output['choices'][0]['text'].strip()
    except Exception:
        pass

    return None
