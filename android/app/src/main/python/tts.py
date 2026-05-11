"""
Text-to-Speech Module - Voice output for bot responses

PURPOSE:
Converts the bot's text response into spoken audio.

STRATEGY:
For MVP, TTS is handled by Android's native TextToSpeech engine
(not in Python). This stub is a placeholder for future
bundled TTS (e.g., Piper TTS) if platform TTS proves unreliable.

The actual TTS happens in the React Native layer using the
Android TextToSpeech class, which is more reliable and doesn't
require bundling additional model files.
"""

import os
import tempfile


def speak_text(text: str, language: str = 'en', output_uri: str = None) -> str:
    """
    Generate speech audio from text.
    
    NOTE: In the current implementation, this is a placeholder.
    TTS is handled by Android's native TextToSpeech class via
    the React Native bridge, not in Python.
    
    Args:
        text: Text to speak
        language: Language code ('en', 'ta', 'hi')
        output_uri: Optional output file path
    
    Returns:
        Path to generated audio file (empty string for native TTS)
    """
    return ''
