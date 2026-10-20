"""Per-file SFX peak lag (sound-design §4.6 "偏移二") and peak level, in frames @30fps.
Usage: python sfx_peaks.py public/audio"""
import sys, os, numpy as np, librosa
d = sys.argv[1]
for f in sorted(os.listdir(d)):
    if not f.endswith('.mp3') or f.startswith('bgm'):
        continue
    y, sr = librosa.load(os.path.join(d, f), sr=48000, mono=True)
    env = librosa.feature.rms(y=y, frame_length=480, hop_length=240)[0]  # 5ms hop
    k = int(np.argmax(env))
    print(f"{f:26s} dur {len(y)/sr:5.2f}s  peakLag {k*240/sr*30:6.2f}f  peak {20*np.log10(np.abs(y).max()+1e-9):6.1f}dBFS")
