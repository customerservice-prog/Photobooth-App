# Friendly Booth voice source

Eight cues (ready, 3, 2, 1, smile, next2, next3, next4) are rendered
one time using scripts/generate-cheerful-voice.py, from the expressive
American female af_heart voice in Kokoro-82M.

Kokoro-82M is provided under the Apache License 2.0 license:
https://huggingface.co/hexgrad/Kokoro-82M

The iPad uses the bundled WAV files and does not depend on a third-party
speech API or an internet connection after loading the app. The separate
media-route.wav file is part of the existing iPad audio-unlock mechanism.
These are AI-generated voices, not recordings of a real performer.
