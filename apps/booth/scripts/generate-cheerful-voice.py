"""Render bundled photo-booth voice clips using open-weight Kokoro-82M.

Model: hexgrad/Kokoro-82M (Apache-2.0).
Voice: af_heart, a warm expressive American female voice.
The booth needs no TTS service at runtime.
"""
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline

OUT = Path(__file__).resolve().parents[1] / "public" / "audio"
RATE = 24000
LINES = {
    "ready": ("Okay, get ready!", 1.08),
    "3": ("Three!", 1.15),
    "2": ("Two!", 1.15),
    "1": ("One!", 1.15),
    "smile": ("Big smile!", 1.08),
    "next2": ("Lovely! Photo two is next. Change your pose!", 1.09),
    "next3": ("You're doing great! Photo three is next. New pose!", 1.09),
    "next4": ("Amazing! One last photo. Strike a fun pose!", 1.09),
}

def main():
    torch.set_num_threads(2)
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    OUT.mkdir(parents=True, exist_ok=True)
    for key, (text, speed) in LINES.items():
        pieces = [np.asarray(audio, dtype=np.float32).reshape(-1)
                  for _, _, audio in pipeline(text, voice="af_heart", speed=speed)]
        pieces = [part for part in pieces if part.size]
        if not pieces:
            raise RuntimeError(f"Voice generator produced no audio for {key}")
        signal = np.concatenate((
            np.zeros(int(RATE * 0.035), dtype=np.float32),
            *pieces,
            np.zeros(int(RATE * 0.085), dtype=np.float32),
        ))
        peak = float(np.max(np.abs(signal)))
        if not 0.005 < peak <= 10:
            raise RuntimeError(f"Invalid or silent voice for {key}: {peak}")
        signal *= min(1.0, 0.89 / peak)
        seconds = signal.size / RATE
        if not 0.2 < seconds < 9:
            raise RuntimeError(f"Invalid duration for {key}: {seconds}")
        path = OUT / f"{key}.wav"
        sf.write(path, signal, RATE, subtype="PCM_16")
        print(f"{key}: {seconds:.2f}s, {path.stat().st_size} bytes")
    print("Eight cheerful female clips rendered and bundled.")

if __name__ == "__main__":
    main()
