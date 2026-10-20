"""Post-render audio checks.
  1. S5 / sound-design §4.6: output-track lag — cross-correlate sharp SFX sources against the no-BGM render.
  2. music-beat-sync §5b: refit the beat grid on the BGM render and compare every designed cut point (≤3f).
Usage: python check_render.py <render.wav> <render-nobgm.wav> <public/audio dir>
"""
import sys, json, numpy as np, librosa

FPS = 30
T = 0.4917954637470821
FILM_BEAT0 = 0.0669046672577211 + 104 * T - 1536 / FPS + 2048 / 48000  # incl. measured output lag
beatF = lambda n: round((FILM_BEAT0 + n * T) * FPS)
CUT_BEATS = [8, 20, 30, 42, 46, 56, 63, 67, 76, 86, 90]  # shot boundaries + outro slam
render, nobgm, audio_dir = sys.argv[1:4]
SR = 48000

# ---- 1. output offset via SFX probes (expected = designed `from` frame of the cue) ----
OUT_F = 2048 / 48000 * FPS
I = beatF(90)
# (src, target peak frame, measured per-file peak lag)
PROBES = [('click-camera.mp3', beatF(20) + 114, 5.85), ('switch-click-quick.mp3', beatF(67) + 48, 0.3),
          ('transition-snap.mp3', beatF(8) + 130, 3.45), ('impact-deep-whoosh.mp3', I, 16.65)]
probes = {src: (tgt, pk, max(0, round(tgt - pk - OUT_F))) for src, tgt, pk in PROBES}
y, _ = librosa.load(nobgm, sr=SR, mono=True)
lags = []
for src, (tgt, pk, f) in probes.items():
    s, _ = librosa.load(f"{audio_dir}/{src}", sr=SR, mono=True)
    s = s[: int(0.25 * SR)]
    a0 = int((f / FPS - 0.3) * SR); seg = y[a0: a0 + int(0.9 * SR)]
    c = np.correlate(seg, s, mode='valid')
    c /= (np.linalg.norm(s) * np.sqrt(np.convolve(seg ** 2, np.ones(len(s)), 'valid')) + 1e-9)
    k = int(np.argmax(c)); t = (a0 + k) / SR
    lags.append(t * FPS - f)
    print(f"probe {src:24s} cue from f{f}  audible start {t*FPS:8.2f}f (lag {lags[-1]:+.2f}f)  peak lands {t*FPS+pk:8.2f}f vs target f{tgt}  err {t*FPS+pk-tgt:+.2f}f")
print(f"output lag mean {np.mean(lags):+.2f}f  spread {np.ptp(lags):.2f}f")

# ---- 2. beat check on the BGM render ----
y, sr = librosa.load(render, sr=None, mono=True)
yp = librosa.effects.hpss(y)[1]
_, beats = librosa.beat.beat_track(y=yp, sr=sr, tightness=400, units='time')
i = np.arange(len(beats)); (Tm, t0m), *_ = np.linalg.lstsq(np.vstack([i, np.ones_like(i)]).T, beats, rcond=None)
onsets = librosa.onset.onset_detect(y=yp, sr=sr, units='time')
print(f"render grid: BPM {60/Tm:.2f}  t0 {t0m:.4f}s (design FILM_BEAT0 {FILM_BEAT0:.4f}s)")
rows = []
for n in CUT_BEATS:
    f = beatF(n)
    near = onsets[np.argmin(np.abs(onsets - f / FPS))]
    err = near * FPS - f
    rows.append(err)
    print(f"beat {n:3d} cut f{f:5d}  nearest transient {near*FPS:8.2f}f  err {err:+.2f}f  {'OK' if abs(err) <= 3 else 'FIX'}")
print(f"max |err| {max(abs(e) for e in rows):.2f}f  mean {np.mean(rows):+.2f}f")
