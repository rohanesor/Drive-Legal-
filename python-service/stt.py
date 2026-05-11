import os
from typing import Optional

try:
    from pywhispercpp.model import Model
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models', 'whisper-tiny')
_model = None


def _load_model(language: str = 'en'):
    global _model
    if _model is None and WHISPER_AVAILABLE:
        lang_code = {
            'en': 'en',
            'ta': 'ta',
            'hi': 'hi',
        }.get(language, 'en')
        _model = Model('tiny', models_dir=MODEL_DIR, language=lang_code)
    return _model


def transcribe_audio(audio_uri: str, language: str = 'en') -> Optional[str]:
    model = _load_model(language)
    if model is None:
        return None

    try:
        segments = model.transcribe(audio_uri)
        text = ' '.join([seg.text for seg in segments])
        return text.strip()
    except Exception as e:
        print(f"Whisper transcription error: {e}")
        return None
