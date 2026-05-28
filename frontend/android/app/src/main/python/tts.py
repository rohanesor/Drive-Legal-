import os
import tempfile

def speak_text(text: str, language: str = 'en', output_uri: str = None) -> str:
    if not output_uri:
        fd, output_uri = tempfile.mkstemp(suffix='.wav')
        os.close(fd)
    with open(output_uri, 'wb') as f:
        f.write(b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00')
    return output_uri
