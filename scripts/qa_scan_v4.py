#!/usr/bin/env python3
"""
HighScore v4 — Form-level QA scanner for restatement (rephrase) questions.
MANDATORY GATE: a batch must print "DIVERGING FEATURES: NONE" (or only sample-noise
divergences on features with n<8) before any is_published flip.

Usage:
    python qa_scan_v4.py <batch.json> [--level L2|L3|L4|L5]

<batch.json> format: list of objects, each:
    {"stem": str, "correct": str, "distractors": [str,str,str],
     "mechanisms": ["R7","R2","R3"], "proximities": ["P2","P2","P3"]}

Baseline = real NITE corpus at docs/truth_corpus/truth_items_full.csv, filtered to the
position that maps to the requested level (L2->q9, L3->q10, L4->q11, L5->q12); if no
--level, uses all 116.

What it measures (29 answer-predicting signals). For each, "could a test-wise student
who always applied this rule beat 25% random?" If real NITE shows a signal, our batch
MAY show it but must not EXCEED it; if real NITE is neutral, our batch must be neutral too.
"""
import csv, re, sys, json, statistics as st
from collections import Counter

TRUTH = "docs/truth_corpus/truth_items_full.csv"
LEVEL_POS = {"L2":9, "L3":10, "L4":11, "L5":12}

ABS=set('all every never always only none entire entirely complete completely impossible certainly must exclusively sole solely'.split())
HEDGE=set('may might can could some often usually generally likely tend tends almost nearly most many sometimes perhaps'.split())
NEG=set("not never no nothing none cannot n't without".split())
CONN=set('although though while whereas despite because since if when unless before after once even'.split())
NUMWORDS=set('one two three four five six seven eight nine ten twenty thirty forty fifty hundred thousand million billion first second third fourth fifth quarter half percent century centuries decade decades'.split())
ER_STOP=set('other another after over under never ever water matter together whether rather former latter order however moreover per number'.split())

def nrm(s): return [w.lower().strip('.,;:"()\'') for w in s.split()]
def alpha(s): return re.findall(r"[A-Za-z][A-Za-z'-]*", s)
def content(s): return set(w.lower() for w in alpha(s) if len(w)>=4)
def lcr(a,b):
    A,B=nrm(a),nrm(b);best=0
    for i in range(len(A)):
        for j in range(len(B)):
            k=0
            while i+k<len(A) and j+k<len(B) and A[i+k]==B[j+k]:k+=1
            if k>best:best=k
    return best
def opening(a,b):
    n=0
    for x,y in zip(nrm(a),nrm(b)):
        if x==y:n+=1
        else:break
    return n
def pn_set(s):
    out=set();t=s.split()
    for i,w in enumerate(t):
        w=re.sub(r"[^A-Za-z'-]","",w)
        if w and w[0].isupper() and i>0: out.add(w.lower())
    return out
def cin(s,v): return sum(1 for w in nrm(s) if w in v)
def comparatives(s):
    c=cin(s,{'more','most','less','least','better','best','worse','worst','faster','slower','greater'})
    for t in nrm(s):
        if t in ER_STOP:continue
        if (t.endswith('est') and len(t)>4) or (t.endswith('er') and len(t)>5):c+=1
    return c

NUMF=['word_count','commas','absolutes','hedges','negations','proper_nouns','stem_overlap',
      'stem_run','stem_opening','consensus_overlap','novel_content','avg_word_len','comparatives','special_punct']
def numf(stem,opts):
    sc=content(stem);f={}
    f['word_count']=[len(o.split()) for o in opts]
    f['commas']=[o.count(',') for o in opts]
    f['absolutes']=[cin(o,ABS) for o in opts]
    f['hedges']=[cin(o,HEDGE) for o in opts]
    f['negations']=[cin(o,NEG) for o in opts]
    f['proper_nouns']=[len(pn_set(o)) for o in opts]
    f['stem_overlap']=[len(content(o)&sc) for o in opts]
    f['stem_run']=[lcr(stem,o) for o in opts]
    f['stem_opening']=[opening(stem,o) for o in opts]
    f['consensus_overlap']=[st.mean(len(content(opts[i])&content(opts[j])) for j in range(4) if j!=i) for i in range(4)]
    f['novel_content']=[len(content(o)-sc) for o in opts]
    f['avg_word_len']=[st.mean([len(w) for w in alpha(o)]) if alpha(o) else 0 for o in opts]
    f['comparatives']=[comparatives(o) for o in opts]
    f['special_punct']=[len(re.findall(r'[\u2013\u2014"();:]',o)) for o in opts]
    return f

def scan_numeric(dataset):
    R={}
    for feat in NUMF:
        hm=tm=hn=tn=0
        for stem,opts,key in dataset:
            v=numf(stem,opts)[feat];mx,mn=max(v),min(v)
            if v.count(mx)==1: tm+=1;hm+=(v.index(mx)==key)
            if v.count(mn)==1: tn+=1;hn+=(v.index(mn)==key)
        R[feat]=(100*hm/tm if tm else 0,tm,100*hn/tn if tn else 0,tn)
    return R

def structural(items):
    """items: list of dict(stem, correct, distractors). Returns list of gate violations."""
    viol=[]
    for i,it in enumerate(items,1):
        opts=[it['correct']]+it['distractors']
        rc=max(lcr(it['correct'],d) for d in it['distractors'])
        oc=max(opening(it['correct'],d) for d in it['distractors'])
        rs=max(lcr(it['stem'],o) for o in opts)
        os_=max(opening(it['stem'],o) for o in opts)
        if rc>6: viol.append(f"item {i}: correct shares {rc}-word run with a distractor (max 6)")
        if rs>6: viol.append(f"item {i}: an option shares {rs}-word run with the stem (max 6)")
        if oc>3 or os_>3: viol.append(f"item {i}: {max(oc,os_)} identical opening words (max 3)")
        firsts=[nrm(o)[0] for o in opts]
        conns=[x for x in firsts if x in CONN]
        if conns and max(Counter(conns).values())>=2:
            viol.append(f"item {i}: two options open with the same connective")
        if len(set(firsts[1:]))==1 and firsts[0]!=firsts[1]:
            viol.append(f"item {i}: correct answer is the structural odd-one-out (all 3 distractors open alike)")
    return viol

def load_truth(level):
    rows=list(csv.DictReader(open(TRUTH)))
    if level and level in LEVEL_POS:
        rows=[r for r in rows if int(r['position'])==LEVEL_POS[level]]
    return [(r['stem'],[r['opt1'],r['opt2'],r['opt3'],r['opt4']],int(r['official_key'])-1) for r in rows]

def main():
    if len(sys.argv)<2:
        print(__doc__); sys.exit(1)
    batch=json.load(open(sys.argv[1]))
    level=None
    if '--level' in sys.argv: level=sys.argv[sys.argv.index('--level')+1]
    items=[dict(stem=b['stem'],correct=b['correct'],distractors=b['distractors']) for b in batch]
    bset=[(it['stem'],[it['correct']]+it['distractors'],0) for it in items]
    truth=load_truth(level)

    print(f"=== HighScore v4 QA scan — {len(items)} items vs {'position '+str(LEVEL_POS[level]) if level in LEVEL_POS else 'all 116'} real (n={len(truth)}) ===\n")
    # structural (hard gates — any violation fails)
    sv=structural(items)
    print("STRUCTURAL GATES:")
    if sv:
        for v in sv: print("  FAIL "+v)
    else:
        print("  all clear")
    # numeric/statistical divergence
    T=scan_numeric(truth); B=scan_numeric(bset)
    print("\nSTATISTICAL DIVERGENCE (feature | real max/min | batch max/min):")
    diverge=[]
    for f in NUMF:
        rmx,rnx,rmn,rnn=T[f]; bmx,bnx,bmn,bnn=B[f]
        note=''
        # only flag when the batch sample is large enough (n>=4 of applicable items) AND the
        # real baseline sample is meaningful (n>=8) — otherwise it's sample noise
        if bnx>=4 and rnx>=8 and abs(bmx-rmx)>=28: note='<< MAX DIVERGES'; diverge.append(f+'/max')
        if bnn>=4 and rnn>=8 and abs(bmn-rmn)>=28: note+=' << MIN DIVERGES'; diverge.append(f+'/min')
        if note:
            print(f"  {f:<18} real {rmx:.0f}%/{rmn:.0f}%  batch {bmx:.0f}%/{bmn:.0f}%  {note}")
    if not diverge: print("  none beyond sample noise")

    print("\n" + "="*60)
    if sv:
        print(f"RESULT: STRUCTURAL FAILURE — {len(sv)} violation(s). Fix before insert.")
        sys.exit(2)
    elif diverge:
        print(f"DIVERGING FEATURES: {sorted(set(diverge))}")
        print("RESULT: statistical divergence on a large-sample feature. Regenerate the flagged items.")
        sys.exit(3)
    else:
        print("DIVERGING FEATURES: NONE")
        print("RESULT: PASS — form-level gates clear. (Still requires blind-solver pass for single-key.)")
        sys.exit(0)

if __name__=="__main__":
    main()
