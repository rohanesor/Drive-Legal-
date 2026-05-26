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
    history: List[Dict] = None,
) -> Optional[str]:
    model = _load_model()
    if model is None:
        return None

    laws_text = '\n\n'.join([
        f"- Section {law.get('section', 'Unknown')}: {law.get('description', '')}"
        for law in laws
    ])

    # Enhanced ChatGPT-like persona
    system_prompt = f"""You are TrafiAI, a conversational, proactive, and friendly AI legal mobility assistant for Indian drivers.
Context:
- User's State: {state}
- Language: {language}

Legal Knowledge Base:
{laws_text}

Persona Guidelines:
- Be human-like and empathetic, not robotic.
- Always provide specific Section numbers (e.g., Section 194).
- State clear penalty amounts for {state}.
- If the user's question is safety-related, give a brief proactive safety tip.
- Keep answers concise but complete.
- Use natural conversational fillers like "I see," "In that case," or "Actually."
- If you don't have a specific answer in the provided laws, offer general guidance and suggest checking with the RTO.
- ALWAYS respond in {language}.
"""

    history_text = ""
    if history:
        # Only take last 4 turns for context to save tokens
        for turn in history[-4:]:
            role = "user" if turn.get('role') == 'user' else "assistant"
            content = turn.get('content', '')
            history_text += f"<|{role}|>\n{content}</s>\n"

    # TinyLlama chat template
    full_prompt = f"<|system|>\n{system_prompt}</s>\n{history_text}<|user|>\n{prompt}</s>\n<|assistant|>\n"

    try:
        from llama_cpp import Llama
        if isinstance(model, Llama):
            output = model(
                full_prompt,
                max_tokens=max_tokens,
                temperature=0.4, # Slightly higher for more natural flow
                top_p=0.9,
                stop=['</s>', '<|user|>', '<|system|>'],
                echo=False,
            )
            return output['choices'][0]['text'].strip()
    except Exception as e:
        print(f"LLM Generation Error: {e}")
        pass

    return None
