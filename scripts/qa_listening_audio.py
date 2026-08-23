#!/usr/bin/env python3
"""
HighScore — acoustic QA gate for generated listening audio.

MANDATORY: every rendered clip must print PASS here before it is uploaded to Storage.
Read-only; it never edits audio.

Usage
-----
    python scripts/qa_listening_audio.py <dir-or-file> --type completion
    python scripts/qa_listening_audio.py <dir> --type short|medium|long   (or s30|s60|s90)
    python scripts/qa_listening_audio.py scripts/audio_output_lecture_qa --type lecture_qa
    python scripts/qa_listening_audio.py <dir> --type completion --transcripts t.json

    --type lecture_qa : for the MIXED output dir of generate-lecture-qa-audio.js —
    every clip is auto-bucketed (short/medium/long) by its trimmed speech duration,
    _part_/_gap_ temp files are skipped, and the cut tone is forbidden.

    t.json : {"<file stem>": "the script text", ...}  -> enables the WPM check.

Why trimming comes first
------------------------
Reference recordings are screen captures: 1.1-15.4 s of leading padding and 0.9-6.7 s
trailing were measured in the real corpus. Raw file duration is NOT the item. Every
threshold below is defined on SPEECH duration after trimming, and every reference
range was re-measured that way on 2026-08-11. Validation of the method: re-deriving
wpm from trimmed durations reproduced the documented figures for all six recordings
that have transcripts, to within 3 wpm.

Thresholds — docs/truth_corpus/MEASURED_CORPUS_2026-08-11.md
------------------------------------------------------------
                trimmed speech   internal silence
  completion    12.5-25.4 s (aim ~20)     23-38 %
  short         26.0-45.0 s               23-38 %
  medium        58.0-60.2 s               23-38 %
  long          74.2-95.8 s               23-38 %

Cut tone (completions only; must be ABSENT from lecture_qa):
  1050 Hz for 1.05-1.60 s, or 523 Hz for 0.90-0.95 s. Both are attested in the real
  corpus and either is acceptable. Followed by 0.7-1.9 s of silence to end of file.
"""
import subprocess, sys, os, json, glob, argparse
import numpy as np

SR = 16000
# Bounds = the observed envelope plus ~4% headroom. Setting them exactly on the
# observed min/max makes the extreme reference files fail on float rounding, and it
# would hold our content to a tighter standard than the real exam meets.
# (observed, trimmed: completion 12.5-25.4 | short 26.0-45.0 | medium 58.0-60.2 |
#  long 74.2-95.8 -- see MEASURED_CORPUS_2026-08-11.md)
SPEC = {
    # WPM bands realigned to LISTENING_FORMAT.md §1 on 2026-08-16 (Lion's call:
    # the measured doc governs, the script's earlier bands had no documented
    # source). Previous values were short (125,145) / medium (155,185) /
    # long (155,180) -- medium in particular excluded most of the real corpus.
    "completion": dict(lo=12.0, hi=27.0, aim=20.0, tone=True,  wpm=(129, 159)),
    "short":      dict(lo=25.0, hi=47.0, aim=35.0, tone=False, wpm=(125, 170)),
    "medium":     dict(lo=56.0, hi=62.0, aim=59.0, tone=False, wpm=(135, 180)),
    "long":       dict(lo=72.0, hi=98.0, aim=84.0, tone=False, wpm=(150, 190)),
}
# lecture_qa buckets (DB values) map onto the measured envelopes above.
# `--type lecture_qa` accepts a MIXED directory (s30+s60+s90 together, which is
# what generate-lecture-qa-audio.js produces) and auto-classifies each file by
# its trimmed speech duration; a file falling in the gap between envelopes fails.
BUCKET_ALIAS = {"s30": "short", "s60": "medium", "s90": "long"}
# Calibration rule: these bounds are set so that the REAL reference corpus passes.
# A gate that rejects ground truth is a broken gate. Measured internal silence was
# 12.2-36.0% for completions and 17.6-35.1% for conversations, so the band is widened
# to 12-38% rather than the 23-38% quoted in LISTENING_FORMAT (that figure describes
# the corpus average, not the per-clip envelope).
SIL_LO, SIL_HI = 12.0, 38.0
TONES = [(1050, 1.00, 1.65), (523, 0.85, 1.00)]
POST_TONE = (0.6, 2.0)

# Screen-capture artefacts. On reference files these are expected and reported as
# NOTES. On our own renders they are real defects -- pass --strict to make them fatal.
LEAD_MAX = 1.0
POST_TONE_PAD = 2.0


def load(path):
    p = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1",
                        "-ar", str(SR), "-f", "s16le", "-"], capture_output=True)
    if p.returncode != 0 or not p.stdout:
        return None
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def energy(x, ms=20):
    w = int(ms / 1000 * SR)
    n = (len(x) - w) // w
    return np.array([np.sqrt(np.mean(x[i * w:i * w + w] ** 2)) for i in range(n)]), w


def trim(x):
    """Return (lead_s, tail_s, trimmed_s, internal_silence_pct) using an adaptive floor."""
    e, w = energy(x)
    db = 20 * np.log10(np.maximum(e, 1e-9))
    thr = max(np.percentile(db, 10) + 12, -45)
    act = db > thr
    k = 5                                    # 100 ms of sustained activity
    run = np.convolve(act.astype(int), np.ones(k, int), "same") >= k
    idx = np.where(run)[0]
    if len(idx) == 0:
        return None
    dur = len(x) / SR
    lead = idx[0] * w / SR
    tail = dur - (idx[-1] + 1) * w / SR
    inner = act[idx[0]:idx[-1] + 1]
    return lead, tail, dur - lead - tail, float((~inner).mean() * 100)


def find_tone(x):
    """Locate the longest tonal run in the last 8 s. Returns (start_s, len_s, hz)."""
    w = int(0.05 * SR)
    dur = len(x) / SR
    start = int(max(0, dur - 8) * SR)
    hits = []
    for i in range(start, len(x) - w, w):
        f = x[i:i + w] * np.hanning(w)
        S = np.abs(np.fft.rfft(f))
        k = int(np.argmax(S))
        if S[k] / max(S.sum(), 1e-9) > 0.25 and S[k] > 0.3:
            hits.append(i)
    if not hits:
        return None
    runs, cur = [], [hits[0]]
    for a, b in zip(hits, hits[1:]):
        (cur.append(b) if b - a <= w * 1.5 else (runs.append(cur), cur.clear(), cur.append(b)))
    runs.append(cur)
    r = max(runs, key=len)
    a, b = r[0], r[-1] + w
    seg = x[a:b] * np.hanning(b - a)
    S = np.abs(np.fft.rfft(seg))
    fr = np.fft.rfftfreq(b - a, 1 / SR)
    S[fr < 150] = 0
    return a / SR, (b - a) / SR, float(fr[int(np.argmax(S))])


def classify_lecture_bucket(trimmed):
    """Auto-classify a lecture_qa clip into short/medium/long by trimmed speech
    duration. Returns (spec_key or None, note)."""
    for key in ("short", "medium", "long"):
        if SPEC[key]["lo"] <= trimmed <= SPEC[key]["hi"]:
            return key, f"auto-bucket: {key}"
    return None, None


def check(path, kind, transcripts, strict=False):
    x = load(path)
    name = os.path.basename(path)
    if x is None:
        return name, ["cannot decode"], [], {}
    t = trim(x)
    if t is None:
        return name, ["no speech detected"], [], {}
    lead, tail, trimmed, sil = t

    if kind == "lecture_qa":
        kind, note = classify_lecture_bucket(trimmed)
        if kind is None:
            return name, [f"speech {trimmed:.1f}s falls between bucket envelopes "
                          f"(short {SPEC['short']['lo']}-{SPEC['short']['hi']} / "
                          f"medium {SPEC['medium']['lo']}-{SPEC['medium']['hi']} / "
                          f"long {SPEC['long']['lo']}-{SPEC['long']['hi']})"], [], dict(trim=trimmed, sil=sil)
    else:
        note = None

    spec = SPEC[kind]
    errs, notes, info = [], [], dict(trim=trimmed, sil=sil, lead=lead, tail=tail)
    if note:
        notes.append(note)

    def artefact(msg):
        (errs if strict else notes).append(msg)

    if not spec["lo"] <= trimmed <= spec["hi"]:
        errs.append(f"speech {trimmed:.1f}s outside {spec['lo']}-{spec['hi']}s")
    if not SIL_LO <= sil <= SIL_HI:
        errs.append(f"internal silence {sil:.0f}% outside {SIL_LO:.0f}-{SIL_HI:.0f}%")
    if lead > LEAD_MAX:
        artefact(f"leading silence {lead:.1f}s (a clean render starts <{LEAD_MAX}s)")

    tone = find_tone(x)
    if spec["tone"]:
        if not tone:
            errs.append("cut tone MISSING")
        else:
            ts, tl, hz = tone
            info["tone"] = f"{hz:.0f}Hz {tl:.2f}s"
            ok = any(abs(hz - f) < 40 and lo <= tl <= hi for f, lo, hi in TONES)
            if not ok:
                errs.append(f"tone {hz:.0f}Hz/{tl:.2f}s matches neither "
                            f"1050Hz(1.00-1.65s) nor 523Hz(0.85-1.00s)")
            post = len(x) / SR - (ts + tl)
            if post < POST_TONE[0]:
                errs.append(f"only {post:.2f}s of silence after the tone "
                            f"(need >={POST_TONE[0]}s)")
            elif post > POST_TONE_PAD:
                artefact(f"{post:.2f}s after the tone — trailing capture padding")
    elif tone and tone[1] > 0.8:
        errs.append(f"unexpected tone {tone[2]:.0f}Hz — lecture_qa clips carry none")

    stem = os.path.splitext(name)[0]
    if transcripts and stem in transcripts:
        words = len(transcripts[stem].split())
        wpm = words / trimmed * 60
        info["wpm"] = wpm
        lo, hi = spec["wpm"]
        if not lo <= wpm <= hi:
            errs.append(f"{wpm:.0f} wpm outside {lo}-{hi}")
    return name, errs, notes, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("target")
    ap.add_argument("--type", required=True,
                    choices=list(SPEC) + ["lecture_qa"] + list(BUCKET_ALIAS))
    ap.add_argument("--transcripts")
    ap.add_argument("--strict", action="store_true",
                    help="treat capture artefacts (leading/trailing padding) as failures. "
                         "Use for our own renders; omit when checking reference files.")
    a = ap.parse_args()
    a.type = BUCKET_ALIAS.get(a.type, a.type)  # s30/s60/s90 → short/medium/long

    tr = json.load(open(a.transcripts, encoding="utf-8")) if a.transcripts else None
    files = ([a.target] if os.path.isfile(a.target)
             else sorted(glob.glob(os.path.join(a.target, "*.mp3"))
                         + glob.glob(os.path.join(a.target, "*.wav"))))
    # Render scripts leave _part_/_gap_/_concat_ temp files next to the final
    # clips — those are fragments, not items; never judge them.
    files = [f for f in files if not os.path.basename(f).startswith("_")]
    if not files:
        sys.exit("no audio found")

    if a.type == "lecture_qa":
        print(f"type=lecture_qa (mixed dir; each file auto-bucketed by trimmed speech duration), "
              f"silence {SIL_LO:.0f}-{SIL_HI:.0f}%, tone forbidden\n")
    else:
        print(f"type={a.type}  spec: speech {SPEC[a.type]['lo']}-{SPEC[a.type]['hi']}s, "
              f"silence {SIL_LO:.0f}-{SIL_HI:.0f}%, "
              f"tone {'required' if SPEC[a.type]['tone'] else 'forbidden'}\n")
    print(f"{'file':<40}{'speech':>8}{'sil%':>7}{'wpm':>6}  {'tone':<16}status")
    bad = 0
    for p in files:
        name, errs, notes, info = check(p, a.type, tr, a.strict)
        bad += bool(errs)
        print(f"{name[:38]:<40}{info.get('trim',0):>8.1f}{info.get('sil',0):>7.1f}"
              f"{info.get('wpm',0):>6.0f}  {info.get('tone','-'):<16}"
              f"{'FAIL' if errs else ('ok*' if notes else 'ok')}")
        for e in errs:
            print(f"      ! {e}")
        for n in notes:
            print(f"      · {n}")
    print(f"\n{len(files)-bad}/{len(files)} passed"
          + ("   (* = capture artefact noted; re-run with --strict for our renders)"
             if not a.strict else "   [strict]"))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
