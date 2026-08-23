#!/usr/bin/env python3
"""
Leakage gates for lecture_qa batches — run BEFORE inserting to the DB.

Why this exists: on 2026-08-16 the blind-solver protocol (LECTURE_QA_AUDIT_PROTOCOL
stage 3) was run on batch LQA-PROD-A. A solver with NO transcript scored 10/10
against a 25% chance baseline. Every item was answerable from the options alone.
The faults it named were structural and mostly mechanical, so they are checked here
instead of relying on a human to notice them.

This does NOT replace the blind solver. It catches the cheap faults so the expensive
human/LLM review can spend itself on the ones that need judgement.

Usage:
    python3 qa_lecture_qa_leakage.py docs/lecture_qa_batchX.json [--strict]

Input format: {"batch": str, "lectures": [{key, transcript, questions: [
    {question_text, correct_option_index, options: [{text, k_code, ...}]}]}]}
"""
import argparse
import json
import re
import sys
from collections import Counter
from itertools import combinations

STOP = {
    'the', 'a', 'an', 'of', 'to', 'in', 'is', 'are', 'was', 'were', 'and', 'or',
    'that', 'it', 'its', 'for', 'on', 'at', 'by', 'as', 'with', 'from', 'this',
    'their', 'they', 'them', 'he', 'she', 'his', 'her', 'be', 'been', 'has',
    'have', 'had', 'not', 'but', 'so', 'than', 'into', 'when', 'while', 'which',
}

# Main-idea decoy stems that a test-wise reader eliminates on sight. Named by the
# blind solver as appearing twice in a 6-clip batch.
TIRED_DECOYS = [
    r'\bthe history of\b',
    r'\bthe development of\b',
    r'\bthe story of\b',
]

NEGATORS = r'\b(not|rather than|instead of|no longer)\b'


def words(text):
    return re.findall(r"[a-z']+", text.lower())


def content_words(text):
    return [w for w in words(text) if w not in STOP and len(w) > 2]


def ngrams(text, n=4):
    w = words(text)
    return {' '.join(w[i:i + n]) for i in range(len(w) - n + 1)}


def gate_cross_question_recycling(lec, findings):
    """The same option phrasing reused across the two questions of one clip.

    Blind solver: 'seeing the phrase used as a plainly wrong answer in one item
    tells you it is a sub-detail, not the thesis, in the other.'
    """
    if len(lec['questions']) < 2:
        return
    for qa, qb in combinations(lec['questions'], 2):
        for oa in qa['options']:
            for ob in qb['options']:
                shared = ngrams(oa['text']) & ngrams(ob['text'])
                if shared:
                    findings.append((
                        'BLOCK', lec['key'], 'cross-question option recycling',
                        f"shared span {sorted(shared)[0]!r} appears in both questions"))
                    return


def gate_key_names_its_own_distractor(lec, findings):
    """Correct option explicitly negates a phrase that another option asserts.

    Blind solver on A3-Q1: "'not extra sunshine' vs 'receive more sunshine' — when
    one option contradicts another by name, the contradicting one is nearly always
    keyed." The single loudest tell in the batch.
    """
    for q in lec['questions']:
        opts = q['options']
        key = opts[q['correct_option_index']]
        if not re.search(NEGATORS, key['text'], re.I):
            continue
        tail = re.split(NEGATORS, key['text'], flags=re.I)[-1]
        neg_terms = set(content_words(tail))
        if not neg_terms:
            continue
        for i, o in enumerate(opts):
            if i == q['correct_option_index']:
                continue
            if len(neg_terms & set(content_words(o['text']))) >= 2:
                findings.append((
                    'BLOCK', lec['key'], 'key negates a distractor by name',
                    f"correct option negates {sorted(neg_terms & set(content_words(o['text'])))} "
                    f"which distractor {'ABCD'[i]} asserts"))
                break


def gate_key_is_only_explainer(lec, findings):
    """Key is the only option with causal grammar; distractors are static facts.

    Blind solver: 'filtering for "which option explains rather than merely states"
    resolves most detail items alone.'
    """
    causal = r'\b(because|so that|so |which means|in order to|by |through |sends?|pushes?|carries|makes?|causes?)\b'
    for q in lec['questions']:
        opts = q['options']
        marked = [i for i, o in enumerate(opts) if re.search(causal, o['text'], re.I)]
        if marked == [q['correct_option_index']]:
            findings.append((
                'WARN', lec['key'], 'key is the only causal statement',
                f"only the correct option in {q['question_text'][:45]!r} uses causal grammar; "
                f"give distractors the same shape"))


def gate_length_tell(lec, findings):
    for q in lec['questions']:
        lens = [len(words(o['text'])) for o in q['options']]
        k = q['correct_option_index']
        others = [l for i, l in enumerate(lens) if i != k]
        if lens[k] > max(others) + 3:
            findings.append((
                'WARN', lec['key'], 'correct option is longest by >3 words',
                f"{lens[k]} vs {sorted(others, reverse=True)}"))
        if lens[k] < min(others) - 3:
            findings.append((
                'WARN', lec['key'], 'correct option is shortest by >3 words',
                f"{lens[k]} vs {sorted(others)}"))


def gate_mirror_pair(lec, findings):
    """Two options are the same proposition with opposite valence — the key is
    almost always inside the mirrored pair, which halves the guess space."""
    for q in lec['questions']:
        opts = q['options']
        for i, j in combinations(range(len(opts)), 2):
            a, b = set(content_words(opts[i]['text'])), set(content_words(opts[j]['text']))
            if not a or not b:
                continue
            overlap = len(a & b) / min(len(a), len(b))
            if overlap >= 0.6 and q['correct_option_index'] in (i, j):
                findings.append((
                    'WARN', lec['key'], 'mirror pair contains the key',
                    f"options {'ABCD'[i]}/{'ABCD'[j]} share {overlap:.0%} of content words "
                    f"and one of them is correct"))
                break


def gate_batch_level(lectures, findings):
    """Faults visible only across the whole batch."""
    decoy_hits = []
    for lec in lectures:
        for q in lec['questions']:
            for o in q['options']:
                for pat in TIRED_DECOYS:
                    if re.search(pat, o['text'], re.I):
                        decoy_hits.append((lec['key'], re.search(pat, o['text'], re.I).group()))
    counts = Counter(d for _, d in decoy_hits)
    for decoy, n in counts.items():
        if n > 1:
            keys = [k for k, d in decoy_hits if d == decoy]
            findings.append((
                'BLOCK', ','.join(keys), 'tired main-idea decoy reused in batch',
                f"{decoy!r} used {n}x — eliminable on sight"))

    # Key position spread across the batch.
    positions = [q['correct_option_index'] for lec in lectures for q in lec['questions']]
    c = Counter(positions)
    n = len(positions)
    if n >= 8:
        worst = max(c.values())
        if worst > n * 0.45:
            findings.append((
                'WARN', 'batch', 'key position skew',
                f"position {'ABCD'[max(c, key=c.get)]} holds {worst}/{n} keys"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--strict', action='store_true',
                    help='exit nonzero on WARN as well as BLOCK')
    args = ap.parse_args()

    data = json.load(open(args.path, encoding='utf-8'))
    lectures = data['lectures']
    findings = []

    for lec in lectures:
        gate_cross_question_recycling(lec, findings)
        gate_key_names_its_own_distractor(lec, findings)
        gate_key_is_only_explainer(lec, findings)
        gate_length_tell(lec, findings)
        gate_mirror_pair(lec, findings)
    gate_batch_level(lectures, findings)

    nq = sum(len(l['questions']) for l in lectures)
    print(f"\nbatch {data.get('batch','?')} — {len(lectures)} clips, {nq} questions\n")

    if not findings:
        print("  no leakage tells found")
    for level, where, gate, detail in sorted(findings, key=lambda f: f[0]):
        mark = 'BLOCK' if level == 'BLOCK' else ' WARN'
        print(f"  [{mark}] {where:<12} {gate}\n           {detail}")

    blocks = sum(1 for f in findings if f[0] == 'BLOCK')
    warns = len(findings) - blocks
    print(f"\n{blocks} blocking, {warns} warnings")
    print("\nThese gates catch the mechanical tells only. A batch that passes here "
          "has NOT passed the blind solver (protocol stage 3) — still run it.")

    if blocks or (args.strict and warns):
        sys.exit(1)


if __name__ == '__main__':
    main()
