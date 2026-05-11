"""
Speech-to-Text Module - Whisper transcription for voice input

PURPOSE:
Converts recorded audio (user's voice) into text that can be
processed by the chatbot pipeline.

MODEL:
- Uses whisper.cpp (C++ implementation) via pywhispercpp binding
- whisper-tiny model (~39MB) - smallest but fastest
- Supports English, Tamil, and Hindi

WHY whisper.cpp INSTEAD OF openai-whisper:
- whisper.cpp doesn't require PyTorch (huge dependency)
- Much smaller memory footprint (~50MB vs ~500MB)
- Works on low-end Android devices
- Compiled C++ is faster on mobile CPUs

HOW IT WORKS:
1. RN records audio and passes file path to Python
2. Whisper loads the audio file
3. Model transcribes audio to text
4. Text is returned to the query pipeline
"""

import os
from typing import Optional

try:
    from pywhispercpp.model import Model
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

# Whisper model files location
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models', 'whisper-tiny')
_model = None


def _load_model(language: str = 'en'):
    """
    Load the whisper model (lazy-loaded on first voice input).
    
    Args:
        language: Target language code ('en', 'ta', 'hi')
    """
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
    """
    Transcribe audio file to text using Whisper.
    
    Args:
        audio_uri: Path to the recorded audio file (M4A/WAV)
        language: Language code for transcription
    
    Returns:
        Transcribed text, or None if transcription failed
    """
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
