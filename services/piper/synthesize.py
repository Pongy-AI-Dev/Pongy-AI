"""Local subprocess only. No network and no transcript logs."""
import base64, io, json, sys, wave
from piper import PiperVoice
voice = PiperVoice.load(sys.argv[1])
def synthesize(value):
    text = value.get('text')
    if not isinstance(text, str) or not 0 < len(text.strip()) <= 1800:
        raise ValueError('SPEECH_INPUT')
    audio = io.BytesIO()
    with wave.open(audio, 'wb') as output:
        voice.synthesize_wav(text.strip(), output)
    return audio.getvalue()
if '--worker' in sys.argv:
    for line in sys.stdin:
        try:
            result = {'audio': base64.b64encode(synthesize(json.loads(line))).decode('ascii')}
        except (ValueError, TypeError, AttributeError):
            result = {'error': 'SPEECH_INPUT'}
        print(json.dumps(result), flush=True)
else:
    sys.stdout.buffer.write(synthesize(json.load(sys.stdin)))
