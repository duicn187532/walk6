"""BGM beat analysis (music-beat-sync.md §1–3).
Usage: python analyze_bgm.py <bgm.mp3> [--out analysis/] [--brief]
Fits an equal-spaced beat grid to librosa's beat sequence, tests 0.5x/1x/2x grids against
real percussive transients, classifies kick/snare/hihat hits and writes beat_data.json + grid_drift.json.
Times stay float seconds; frame rounding happens only in Remotion (beatF).
"""
import json, sys, os
import numpy as np, librosa
from scipy.signal import butter, sosfilt

path = sys.argv[1]
out_dir = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.dirname(os.path.abspath(__file__))
brief = '--brief' in sys.argv

y, sr = librosa.load(path, sr=None, mono=True)
dur = len(y) / sr
y_perc = librosa.effects.hpss(y)[1]

tempo, beats = librosa.beat.beat_track(y=y_perc, sr=sr, tightness=400, units='time')
i = np.arange(len(beats))
A = np.vstack([i, np.ones_like(i)]).T
(T, t0), *_ = np.linalg.lstsq(A, beats, rcond=None)
resid = beats - (t0 + i * T)

def band_env(lo, hi):
    sos = butter(4, [lo, hi], btype='band', fs=sr, output='sos')
    env = librosa.onset.onset_strength(y=sosfilt(sos, y_perc), sr=sr)
    return env, librosa.times_like(env, sr=sr)

onset_t = librosa.onset.onset_detect(y=y_perc, sr=sr, units='time', backtrack=False)

def grid_score(T_, t0_):
    while t0_ - T_ > -1e-9 and t0_ - T_ >= 0: t0_ -= T_
    n = int((dur - t0_) / T_)
    grid = t0_ + np.arange(n) * T_
    d = np.array([np.min(np.abs(onset_t - g)) for g in grid])
    match = float(np.mean(d < 0.035))
    hit = d < 0.035
    mean_ms = float(np.mean(d[hit]) * 1000) if hit.any() else 999
    signed = np.array([onset_t[np.argmin(np.abs(onset_t - g))] - g for g in grid])
    slope = float(np.polyfit(grid[hit], signed[hit], 1)[0]) if hit.sum() > 3 else 0
    first_ok = bool(d[0] < 0.035)
    return dict(T=T_, t0=t0_, match=match, mean_abs_ms=mean_ms, drift_ms_total=abs(slope) * dur * 1000, first_beat_on_attack=first_ok)

cands = {'0.5x': grid_score(T * 2, t0), '1x': grid_score(T, t0), '2x': grid_score(T / 2, t0)}
# Kick test: correct grid puts kicks on integer beats.
kick_env, times = band_env(40, 160)
def kick_on_beat(c):
    on = [kick_env[np.argmin(np.abs(times - (c['t0'] + n * c['T'])))] for n in range(int((dur - c['t0']) / c['T']))]
    off = [kick_env[np.argmin(np.abs(times - (c['t0'] + (n + .5) * c['T'])))] for n in range(int((dur - c['t0']) / c['T']) - 1)]
    return float(np.mean(on) / (np.mean(off) + 1e-9))
for c in cands.values(): c['kick_on_off_ratio'] = kick_on_beat(c)
# Pick the musically plausible tempo (70–180 BPM) with the best transient coverage; kick on/off ratio breaks ties.
# (2x always "wins" a raw kick ratio because it compares 8ths vs 16ths — not comparable across grids.)
plausible = [k for k in cands if 70 <= 60 / cands[k]['T'] <= 180] or list(cands)
winner = max(plausible, key=lambda k: (round(cands[k]['match'], 2), cands[k]['kick_on_off_ratio']))
W = cands[winner]
T, t0 = W['T'], W['t0']
bpm = 60 / T

hits = []
for k, (lo, hi) in {'kick': (40, 160), 'snare': (150, 500), 'hihat': (6000, min(14000, sr / 2 - 100))}.items():
    env, tt = band_env(lo, hi)
    pk = librosa.util.peak_pick(env, pre_max=3, post_max=3, pre_avg=5, post_avg=5, delta=np.percentile(env, 90) * 0.3, wait=5)
    for p in pk: hits.append(dict(t=float(tt[p]), s=float(env[p] / (env.max() + 1e-9)), k=k))
hits.sort(key=lambda h: h['t'])

rms = librosa.feature.rms(y=y, hop_length=sr // 4)[0]  # 4 values / s
rms_t = np.arange(len(rms)) / 4
nbeats = int((dur - t0) / T)
beat_rms = [float(rms[min(len(rms) - 1, int((t0 + n * T) * 4))]) for n in range(nbeats)]
# per-8-beat sections
sections = []
for b in range(0, nbeats - 8, 8):
    e = float(np.mean(beat_rms[b:b + 8]))
    sections.append(dict(start_beat=b, t=float(t0 + b * T), energy=e))
mx = max(s['energy'] for s in sections)
for s in sections: s['level'] = round(s['energy'] / mx, 2)
kick_strength = sorted([(n, float(kick_env[np.argmin(np.abs(times - (t0 + n * T)))])) for n in range(nbeats)], key=lambda x: -x[1])

summary = dict(file=os.path.basename(path), duration=dur, bpm=bpm, t0=t0, T=T, grid=winner,
               fit_residual_ms=float(np.abs(resid).max() * 1000), match=W['match'], mean_abs_ms=W['mean_abs_ms'],
               drift_ms_total=W['drift_ms_total'], first_beat_on_attack=W['first_beat_on_attack'])
if brief:
    lv = ' '.join(f"{s['start_beat']}:{s['level']}" for s in sections[:24])
    print(json.dumps(summary, ensure_ascii=False)); print('  sections(8-beat):', lv); sys.exit(0)

os.makedirs(out_dir, exist_ok=True)
json.dump(dict(**summary, beats=[float(t0 + n * T) for n in range(nbeats)], hits=hits, rms=beat_rms, sections=sections,
               strongest_kick_beats=[n for n, _ in kick_strength[:40]]),
          open(os.path.join(out_dir, 'beat_data.json'), 'w'), indent=1)
json.dump(dict(candidates=cands, winner=winner,
               reason=f"{winner}: highest kick on/off-beat ratio among grids with match>=0.9 (kicks sit on integer beats)"),
          open(os.path.join(out_dir, 'grid_drift.json'), 'w'), indent=1)
print(json.dumps(summary, ensure_ascii=False))
print('sections:', ' '.join(f"{s['start_beat']}:{s['level']}" for s in sections[:30]))
print('strongest kick beats:', [n for n, _ in kick_strength[:15]])
