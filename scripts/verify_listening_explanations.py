#!/usr/bin/env python3
"""
HighScore — mechanical gate for Gemini-authored listening explanations.

MANDATORY: this must print "GATE: PASS" before anything is written to the DB.
It never writes. It emits a merge-only SQL file that preserves existing option keys.

Usage
-----
    python scripts/verify_listening_explanations.py gemini_out.json \
        [--source source.json] [--sql out.sql]

Inputs
------
gemini_out.json : list of {question_id, options:[{index, explanation_he}], highlight_spans:[str]}
source.json     : optional. list of {id, lecture_id, transcript, options:[{text},...]}.
                  lecture_id is optional but recommended: when a passage-track lecture
                  carries two questions, it lets highlight_spans from both be merged
                  into one write instead of the second silently overwriting the first
                  (see emit_sql). If omitted, the script pulls source rows from
                  Supabase using SUPABASE_URL / SUPABASE_SERVICE_KEY from
                  env.scripts.txt or the environment. No credentials are printed.

The seven checks (each failure is fatal, none are warnings)
----------------------------------------------------------
1. STRUCTURE     every item has 4 options, indices exactly {0,1,2,3}, no duplicates,
                 question_id exists in the source.
2. QUOTE PRESENT every explanation contains >=1 "double-quoted" English span.
3. QUOTE SCOPE   every quote appears verbatim in (that option's own text) UNION
                 (the transcript). Deliberately NOT the other options: rule 5 of the
                 prompt forbids referencing them, so a quote lifted from a sibling
                 option is a violation that a whole-item search would silently pass.
4. NO ELLIPSIS   no "..." or "…" inside any quote.
5. NO CROSS-REF  no distractor numbering, ordinal option names ("האפשרות השנייה"),
                 or "the correct answer" language inside a DISTRACTOR's own
                 explanation. The correct option is allowed to describe itself as
                 correct -- that is self-reference, not a comparison to a sibling.
6. LENGTH        explanation <= 200 characters.
7. SPANS         2-4 highlight_spans, each appearing verbatim in the transcript,
                 none positionally overlapping another (true interval overlap, not
                 just substring containment), none longer than 6 words.

Quote matching normalises curly quotes/apostrophes and collapses whitespace before
comparing -- a smart-quote substitution is a transport artefact, not a content error.
Everything else is compared literally.
"""
import json, re, sys, os, argparse, unicodedata

FATAL = []
WARN = []

# ---------------------------------------------------------------- normalising
SMART = {
    "“": '"', "”": '"', "„": '"', "″": '"',
    "‘": "'", "’": "'", "‚": "'", "′": "'",
    "–": "-", "—": "-", "−": "-",
    " ": " ", "‏": "", "‎": "", "‫": "", "‬": "",
}


def norm(s: str) -> str:
    """Fold transport artefacts only: smart punctuation, NBSP, bidi marks, runs of space."""
    if s is None:
        return ""
    s = unicodedata.normalize("NFC", s)
    for a, b in SMART.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


# Raised 200 -> 250 on 2026-08-12. The v1 batch never came close to 200 (median 123,
# max 165), so the cap was never the binding constraint -- the prompt's "one or two
# sentences" was. v2 of the prompt asks for the full pivot CHAIN on multi-pivot items,
# which needs the extra room. The cap is a ceiling, not a target.
MAX_EXPL_CHARS = 250

QUOTE_RE = re.compile(r'"([^"]+)"')

# Hebrew phrasings that point at ANOTHER option -- safe to flag in every explanation,
# correct or distractor, because none of these can describe an option talking about
# itself. Covers bare numbering (מסיח 2), ordinal names (האפשרות השנייה) in both
# masculine/feminine, and explicit comparison words (לעומת/בניגוד).
CROSSREF_RE = re.compile(
    r"(מסיח\s*[1-4]|אופציה\s*[1-4]|תשובה\s*מספר|האפשרות\s*ה?[1-4]|"
    r"(?:ה)?אפשרות\s*(?:השנייה|השלישית|הרביעית)|"
    r"(?:ה)?מסיח\s*(?:השני|השלישי|הרביעי)|"
    r"האפשרות\s*(?:האחרת|האחרות)|שאר\s*ה?אפשרויות|האפשרויות\s*האחרות|"
    r"(?:לעומת|בניגוד\s*ל)\s*ה?(?:אפשרות|תשובה|מסיח))"
)
# "The correct answer" language is only a violation when it appears in a DISTRACTOR's
# explanation (it is then implicitly comparing itself to another, correct, option).
# The correct option describing itself this way is self-reference, not cross-reference
# -- flagging it there would reject the approved worked examples in the prompt.
CROSSREF_TO_CORRECT_RE = re.compile(r"(האפשרות|התשובה|המסיח)\s*ה?נכונ(?:ה|ות|ים)?")


def load_source(path, ids):
    if path:
        with open(path, encoding="utf-8") as f:
            rows = json.load(f)
        return {r["id"]: r for r in rows}
    # fall back to Supabase
    try:
        import urllib.request, urllib.parse
    except Exception:
        sys.exit("need --source or a working network")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not (url and key):
        envf = os.path.join(os.path.dirname(__file__), "..", "env.scripts.txt")
        if os.path.exists(envf):
            for line in open(envf, encoding="utf-8"):
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    os.environ.setdefault(k, v)
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not (url and key):
        sys.exit("SUPABASE_URL / SUPABASE_SERVICE_KEY not found; pass --source instead")
    out = {}
    for i in range(0, len(ids), 20):
        chunk = ids[i:i + 20]
        q = (f"{url}/rest/v1/listening_questions?select=id,options,"
             f"lecture_id,listening_lectures(transcript)&id=in.({','.join(chunk)})")
        req = urllib.request.Request(q, headers={"apikey": key,
                                                 "Authorization": f"Bearer {key}"})
        for r in json.load(urllib.request.urlopen(req)):
            lec = r.get("listening_lectures") or {}
            out[r["id"]] = {"id": r["id"], "lecture_id": r.get("lecture_id"),
                            "options": r["options"], "transcript": lec.get("transcript", "")}
    return out


def fail(qid, msg):
    FATAL.append(f"  [{qid}] {msg}")


def check_item(item, src):
    qid = item.get("question_id", "<missing id>")
    if qid not in src:
        fail(qid, "question_id not found in source")
        return
    s = src[qid]
    tr = norm(s.get("transcript", ""))
    src_opts = s.get("options", [])

    opts = item.get("options", [])
    idxs = [o.get("index") for o in opts]
    if sorted(idxs) != [0, 1, 2, 3]:
        fail(qid, f"indices are {idxs}, expected 0..3 exactly once")
        return
    if len(src_opts) != 4:
        fail(qid, f"source has {len(src_opts)} options, expected 4")
        return

    correct_idx = next((i for i, o in enumerate(src_opts)
                        if o.get("k_code") == "CORRECT" or o.get("fail_mode") is None), None)

    for o in opts:
        n = o["index"]
        expl = o.get("explanation_he", "") or ""
        own = norm(src_opts[n].get("text", ""))
        haystack = own + " || " + tr
        tag = f"option {n}"

        if len(expl) > MAX_EXPL_CHARS:
            fail(qid, f"{tag}: explanation is {len(expl)} chars (max {MAX_EXPL_CHARS})")
        if not expl.strip():
            fail(qid, f"{tag}: empty explanation")
            continue

        m = CROSSREF_RE.search(expl)
        if m:
            fail(qid, f"{tag}: refers to another option -- {m.group(0)!r}")
        elif n != correct_idx:
            m2 = CROSSREF_TO_CORRECT_RE.search(expl)
            if m2:
                fail(qid, f"{tag}: names the correct answer while explaining a "
                          f"distractor -- {m2.group(0)!r}")

        quotes = QUOTE_RE.findall(norm(expl))
        if not quotes:
            fail(qid, f"{tag}: no English quote in double quotes")
        for q in quotes:
            if "..." in q or "…" in q:
                fail(qid, f"{tag}: ellipsis inside quote {q!r}")
                continue
            if q not in haystack:
                where = "transcript" if q in tr else None
                fail(qid, f"{tag}: quote {q!r} not verbatim in its own option or the "
                          f"transcript" + (f" (found in {where})" if where else ""))

    spans = item.get("highlight_spans", [])
    if not 2 <= len(spans) <= 4:
        fail(qid, f"{len(spans)} highlight_spans (need 2-4)")

    # True positional overlap, not substring containment: "as a result" and "a result
    # of" don't contain each other but do overlap in the transcript. A span can occur
    # more than once in a short transcript, so try every occurrence and accept the
    # first one that doesn't collide with an already-placed interval.
    intervals = []
    for sp in spans:
        nsp = norm(sp)
        if nsp not in tr:
            fail(qid, f"highlight_span {sp!r} not verbatim in transcript")
            continue
        if len(nsp.split()) > 6:
            fail(qid, f"highlight_span {sp!r} is {len(nsp.split())} words (max 6)")
        occurrences = []
        start = 0
        while True:
            i = tr.find(nsp, start)
            if i == -1:
                break
            occurrences.append((i, i + len(nsp)))
            start = i + 1
        placed = next((iv for iv in occurrences
                       if all(iv[1] <= a or iv[0] >= b for a, b in intervals)), None)
        if placed is None:
            fail(qid, f"highlight_span {sp!r} overlaps another span in every "
                      f"occurrence in the transcript")
        else:
            intervals.append(placed)


# ------------------------------------------------------------------ merge SQL
SQL_TEMPLATE = """-- {qid}
UPDATE listening_questions q SET options = (
  SELECT jsonb_agg(
    CASE {cases} ELSE elem.value END
    ORDER BY elem.ord)
  FROM jsonb_array_elements(q.options) WITH ORDINALITY elem(value, ord)
)
WHERE q.id = '{qid}';"""


def sql_literal(s):
    return "'" + (s or "").replace("'", "''") + "'"


def emit_sql(items, src, path):
    out = ["-- Generated by verify_listening_explanations.py -- MERGE ONLY.",
           "-- Each statement adds keys to the existing option object with `||`.",
           "-- It never replaces the array, so fail_mode and k_code survive untouched.",
           "BEGIN;", ""]

    # explanations: one UPDATE per question, unaffected by lecture grouping below.
    for it in items:
        cases = []
        for o in sorted(it["options"], key=lambda x: x["index"]):
            payload = {"explanation_he": o.get("explanation_he", "")}
            cases.append(
                f"WHEN (elem.ord-1)={o['index']} THEN elem.value || "
                f"{sql_literal(json.dumps(payload, ensure_ascii=False))}::jsonb"
            )
        stmt = SQL_TEMPLATE.format(qid=it["question_id"], cases=" ".join(cases))
        out.append(stmt + "\n")

    # highlight_spans: listening_lectures.highlight_spans is ONE column per RECORDING,
    # but the passage track puts 2 questions on one recording. Writing one UPDATE per
    # question would have the second question's spans silently overwrite the first's.
    # Group by lecture_id instead and emit exactly one UPDATE per lecture, unioning
    # and de-duplicating (by normalised text) every span any of its questions named,
    # in first-seen order. Items whose source row has no lecture_id (only possible
    # via a hand-built --source file) fall back to the old per-question write, which
    # is correct as long as that lecture truly has just one question.
    lecture_spans = {}       # lecture_id -> {normalised_span: original_span}
    orphan_spans = {}        # question_id -> list[span]   (no lecture_id available)
    for it in items:
        qid = it["question_id"]
        lec_id = (src.get(qid) or {}).get("lecture_id")
        target = lecture_spans.setdefault(lec_id, {}) if lec_id else None
        for sp in it.get("highlight_spans", []):
            if target is not None:
                target.setdefault(norm(sp), sp)
            else:
                orphan_spans.setdefault(qid, []).append(sp)

    for lec_id, span_map in lecture_spans.items():
        spans_json = json.dumps(list(span_map.values()), ensure_ascii=False)
        out.append(f"UPDATE listening_lectures SET highlight_spans = "
                   f"{sql_literal(spans_json)}::jsonb WHERE id = '{lec_id}';\n")
    for qid, spans in orphan_spans.items():
        spans_json = json.dumps(spans, ensure_ascii=False)
        out.append(f"-- no lecture_id in source for {qid}; assumes this lecture has "
                    f"only this one question\n"
                   f"UPDATE listening_lectures l SET highlight_spans = "
                   f"{sql_literal(spans_json)}::jsonb FROM listening_questions q "
                   f"WHERE q.id = '{qid}' AND l.id = q.lecture_id;\n")

    out.append("COMMIT;")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("gemini_json")
    ap.add_argument("--source")
    ap.add_argument("--sql", default="listening_explanations_merge.sql")
    a = ap.parse_args()

    with open(a.gemini_json, encoding="utf-8") as f:
        items = json.load(f)
    if not isinstance(items, list):
        sys.exit("expected a JSON array at the top level")

    ids = [i.get("question_id") for i in items if i.get("question_id")]
    if len(set(ids)) != len(ids):
        FATAL.append("  duplicate question_id in the batch")
    src = load_source(a.source, ids)

    for it in items:
        check_item(it, src)

    n_expl = sum(len(i.get("options", [])) for i in items)
    print(f"items: {len(items)}   explanations: {n_expl}   "
          f"spans: {sum(len(i.get('highlight_spans', [])) for i in items)}")
    if WARN:
        print("\nWARNINGS")
        print("\n".join(WARN))
    if FATAL:
        print(f"\nGATE: FAIL  ({len(FATAL)} problems)")
        print("\n".join(FATAL))
        sys.exit(1)
    emit_sql(items, src, a.sql)
    print(f"\nGATE: PASS   merge SQL written to {a.sql}")
    print("Review it, then run it. It uses `||` only -- fail_mode and k_code are preserved.")


if __name__ == "__main__":
    main()
