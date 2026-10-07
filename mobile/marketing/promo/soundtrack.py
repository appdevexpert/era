"""Synthesizes a royalty-free cinematic/trap-style workout beat for the promo.

Usage: python3 soundtrack.py out.wav DURATION '[hit_seconds, ...]' [promo|explainer]
promo: hits get a sub-boom + impact so the audio lands on the video's flash cuts.
explainer: calmer lo-fi groove; hits become soft UI "tap" blips.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
out, dur, hits = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3])
style = sys.argv[4] if len(sys.argv) > 4 else "promo"
n = int(SR * dur)
mix = np.zeros(n)
rng = np.random.default_rng(7)
BPM = 140 if style == "promo" else 92
beat = 60 / BPM


def add(sig, at, gain=1.0):
    i = int(at * SR)
    if i >= n:
        return
    sig = sig[: n - i]
    mix[i : i + len(sig)] += sig * gain


def env(length, attack=0.002, decay=0.3):
    t = np.arange(int(length * SR)) / SR
    return np.minimum(t / attack, 1) * np.exp(-t / decay)


def kick(length=0.45):
    t = np.arange(int(length * SR)) / SR
    freq = 45 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(length, 0.001, 0.16)


def snare(length=0.25):
    t = np.arange(int(length * SR)) / SR
    noise = rng.standard_normal(len(t))
    noise = np.convolve(noise, [1, -0.6], "same")
    return (0.7 * noise + 0.5 * np.sin(2 * np.pi * 190 * t)) * env(length, 0.001, 0.07)


def hat(length=0.05):
    noise = rng.standard_normal(int(length * SR))
    return np.diff(noise, prepend=0) * env(length, 0.0005, 0.012)


def boom(length=1.6):
    t = np.arange(int(length * SR)) / SR
    freq = 32 + 60 * np.exp(-t * 6)
    sub = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(length, 0.002, 0.55)
    crack = rng.standard_normal(len(t)) * env(length, 0.0005, 0.03)
    return sub + 0.5 * crack


def riser(length):
    t = np.arange(int(length * SR)) / SR
    noise = rng.standard_normal(len(t))
    # crude rising high-pass: difference filter strength grows over time
    shaped = noise - np.roll(noise, 1) * (1 - t / length)
    return shaped * (t / length) ** 2.5 * 0.35


def pad(length, freqs):
    t = np.arange(int(length * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for i, f in enumerate(freqs))
    fade = np.minimum(t / 0.8, 1) * np.minimum((length - t) / 0.8, 1)
    return s * fade / len(freqs)


def arrange_promo():
    # Dark minor pad (D minor) under everything
    add(pad(dur, [73.42, 110.0, 146.83, 174.61]), 0, 0.12)

    # Drums from 2.6s (scene 2) to 14.6s, sparse intro before that
    drum_start, drum_end = 2.6, 14.6
    step = beat / 2
    t = drum_start
    i = 0
    while t < drum_end:
        pos = i % 8
        if pos in (0, 3, 5) or (pos == 6 and (i // 8) % 2):
            add(kick(), t, 0.9)
        if pos in (2, 6):
            add(snare(), t, 0.45)
        add(hat(), t, 0.18 if pos % 2 else 0.1)
        if (i // 8) % 2 and pos == 7:  # trap hat roll
            for k in range(4):
                add(hat(), t + k * step / 4, 0.12)
        t += step
        i += 1

    # Intro heartbeat
    for at in (0.15, 0.15 + beat * 0.5, 0.15 + beat * 2, 0.15 + beat * 2.5):
        add(kick(), at, 0.7)

    # Riser into the logo reveal, then silence-drop before the boom
    add(riser(2.0), 12.8, 1.0)

    for h in hits:
        add(boom(), h, 0.9)

    # Outro: slow kicks under logo/CTA
    for k in range(5):
        add(kick(0.8), 16.35 + k * beat * 2, 0.55)


def tap():
    length = 0.09
    t = np.arange(int(length * SR)) / SR
    return np.sin(2 * np.pi * (1400 - 600 * t / length) * t) * env(length, 0.001, 0.025)


def arrange_explainer():
    # warm major-seventh pad (D maj7), changes every 2 bars
    chords = [[146.83, 185.0, 220.0, 277.18], [123.47, 146.83, 185.0, 220.0], [110.0, 146.83, 164.81, 220.0], [130.81, 164.81, 196.0, 246.94]]
    bar = beat * 4
    k, t0 = 0, 0.0
    while t0 < dur:
        add(pad(min(bar * 2 + 0.8, dur - t0 + 0.01), chords[k % 4]), t0, 0.16)
        t0 += bar * 2
        k += 1
    t = bar  # one bar of pad only, then the groove
    i = 0
    step = beat / 2
    while t < dur - 1.0:
        pos = i % 8
        if pos in (0, 5):
            add(kick(0.35), t, 0.55)
        if pos in (2, 6):
            add(snare(0.18), t, 0.22)
        add(hat(0.04), t + (0.03 if pos % 2 else 0), 0.07 if pos % 2 else 0.05)
        t += step
        i += 1
    for h in hits:
        add(tap(), h, 0.25)


if style == "promo":
    arrange_promo()
else:
    arrange_explainer()

# Master: soft-clip + fade
mix = np.tanh(mix * (1.4 if style == "promo" else 1.1))
fade_out = int(0.6 * SR)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89 if style == "promo" else 0.7
pcm = (mix * 32767).astype(np.int16)
stereo = np.repeat(pcm[:, None], 2, axis=1)

with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(stereo.tobytes())
print(f"soundtrack: {out}")
