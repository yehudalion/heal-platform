# CLAUDE.md — HighScore

## What this is

**HighScore** — a Hebrew-language prep platform for the **HILAL** English exam (the section
separating from the Psychometric). Target: learners sitting the exam from **December 2026**.
Not a general English app. Every feature earns its place by raising the score.

## Canonical product map — read first

`docs/SITEMAP.md` is the single source of truth for product structure: screens, student flow, the 3-layer template per module, label vocabularies, and a per-table verdict.

Rules:
- Before creating, deleting, or refactoring ANY screen or DB table, check SITEMAP.md first.
- If a screen or table is not in SITEMAP.md, it has no owner — do not build on it, and flag it.
- If the map does not cover your case, update SITEMAP.md FIRST and get Lion's explicit approval, then write code. Never the reverse.
- Live query / git output beats any document, including this one. If reality contradicts SITEMAP.md, report the contradiction — do not silently follow either side.

## Hard rules (violating these is a bug, not a style choice)

1. **Subscription-only. No ads, ever.**
2. **All DB access goes through `artifacts/heal/src/data/*.data.js`.** Screens and components
   must never call Supabase directly. If a screen needs data, add a function to the data layer.
3. **Every FK to a user points to `auth.users(id)`** — never to a profile table or anything else.
4. **`is_published` defaults to FALSE.** No content becomes visible without explicit human
   approval. This applies to every content table. (A `DEFAULT true` here is a bug — it has
   happened before; see `restatement_questions`, fixed 2026-07-14.)
5. **No real-time Claude/LLM API calls in the live app.** Content is generated offline, reviewed,
   then inserted. The app reads from the DB.
6. **Wellbeing Rule — no punitive mechanics.** No streak-shaming, no loss framing, no guilt.
   Motivation is built on progress, never on fear.
7. **UI language is Hebrew (RTL). Study content is English.**
8. **Distractors are called "מפתחות" / "למה לשים לב" in the UI — never "traps"** (the DB may use
   internal codes; the user never sees the word "trap").

## The 3-Layer Rule

Every study module has exactly three layers. Do not add a fourth, do not skip one:

- **Learn** — teach the mechanism.
- **Practice** — apply it.
- **Analyze** — show what the learner is weak at, and route them back to Learn.

## Tech stack

- **Vite + vanilla JS** (no framework). Hash-based router in `artifacts/heal/src/main.js`.
- **pnpm** workspaces (`artifacts/heal` is the app; `scripts/` and `lib/` are workspace packages).
- **Supabase** — Postgres + Auth (Google OAuth) + Storage. RLS on all public tables.
- Migrations live in `supabase/migrations/`, named with the **Supabase CLI timestamp convention**
  (`20260714184952_rephrase_v4_clean_slate.sql`). The live migration history is CLI-managed in
  `supabase_migrations.schema_migrations` — a repo file's version must match the recorded version.

## Source of truth — read these, do not duplicate them

The governance docs in `docs/` are authoritative. **Do not restate their content here or in code
comments — point to them, and update them when reality changes.**

| Doc | What it governs |
|---|---|
| `docs/ARCHITECTURE.md` | System rules (§-numbered). The constitution. |
| `docs/CONTENT_GUIDELINES.md` | How content is written and QA'd. |
| `docs/STATE.md` | What actually works right now. Counts must be **verified by query**, never from memory. |
| `docs/TASKS.md` | The task board. Obsolete tasks are marked OBSOLETE, not deleted. |
| `docs/HighScore_Rephrase_Master_Plan_v4_2026-07-14.md` | Rephrase module — the v4 taxonomy (R/P/G). |
| `docs/LISTENING_FORMAT.md` | Listening module — measured format truth. |
| `docs/CONTENT_SOURCES.md` | Licensing boundaries. |

## Copyright boundary (hard)

**Real NITE/HILAL exam items never enter the production database.** The truth corpus lives as
reference CSVs in `docs/truth_corpus/` only, used to calibrate generation. Generated content is
ours; exam items are not.

## Working conventions

- **Verify counts by query before writing them into docs.** Stale numbers have caused real errors.
- **Archive before you delete.** Content deletions get a committed CSV snapshot in `docs/archive/`.
- Secrets live in `env.scripts.txt` / `.env` — both gitignored. Never commit them.
- בעת ייצור פריטי השלמת קטע שמע (continuation) — חובה לקרוא את §4 ב-`CONTENT_GUIDELINES.md`
  ולהריץ את שערי המנה (מבחן ההשהיה, גיוון סוגי-חיתוך, פיזור תשובות, פותר עיוור) לפני הגשה
  לליאון. קושי נקנה במבנה ובמרחק-עוגן, לא באוצר מילים.
