/**
 * M6 — Readiness Score Computation
 *
 * Formula (explicit, not a black box):
 *   1. Fetch all user's listening_responses (correct/total + timestamps)
 *   2. Recency weight: responses older than 30 days count as 0.5
 *   3. readiness_score = round(weightedCorrect / weightedTotal * 100)
 *   4. confidence: total_items_answered < 20 → 'provisional', ≥ 20 → 'stable'
 *   5. skill_accuracy: { skill: pct } — unweighted, per listening_skill enum value
 *   6. accent_accuracy: { accent: pct } — unweighted, per listening_accent enum value
 *   7. Derive weakest_skill, strongest_skill, weakest_accent
 *   8. Append { date, score } to readiness_history (dedup same day, keep 30 entries)
 *   9. Upsert listening_user_state
 *
 * Called at the end of every practice session (after cooldown screen).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Skills tracked for per-skill accuracy (enum values from listening_skill). */
const TRACKED_SKILLS = [
  'syntactic_prediction',
  'argument_navigation',
  'speaker_stance',
  'realtime_processing',
];

/** Responses older than this are half-weighted in the base accuracy calc. */
const RECENCY_CUTOFF_DAYS = 30;
const RECENCY_WEIGHT_OLD  = 0.5;

/** Minimum total items before confidence flips from 'provisional' to 'stable'. */
const CONFIDENCE_THRESHOLD = 20;

/** Max entries kept in readiness_history. */
const MAX_HISTORY = 30;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes the user's readiness score from scratch (all their responses),
 * then upserts listening_user_state.
 *
 * @param {string} userId
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @returns {Promise<object|null>}  The new state object, or null on error.
 */
export async function computeAndSaveReadiness(userId, sb) {
  try {
    // ── Step 1: All responses for this user ───────────────────────────────
    const { data: responses, error: rErr } = await sb
      .from('listening_responses')
      .select('is_correct, created_at, question_id')
      .eq('user_id', userId);

    if (rErr) throw new Error('responses: ' + rErr.message);
    if (!responses?.length) {
      console.log('[M6] no responses yet — skipping');
      return null;
    }

    // ── Step 2: question_id → item_id mapping ─────────────────────────────
    const uniqueQIds = [...new Set(responses.map(r => r.question_id))];
    const { data: questions, error: qErr } = await sb
      .from('listening_questions')
      .select('id, item_id')
      .in('id', uniqueQIds);

    if (qErr) throw new Error('questions: ' + qErr.message);

    // ── Step 3: item_id → primary_skill + accent mapping ──────────────────
    const uniqueItemIds = [...new Set((questions || []).map(q => q.item_id))];
    const { data: items, error: iErr } = await sb
      .from('listening_items')
      .select('id, primary_skill, accent')
      .in('id', uniqueItemIds);

    if (iErr) throw new Error('items: ' + iErr.message);

    // Build lookup maps
    const qToItemId  = Object.fromEntries((questions || []).map(q => [q.id,  q.item_id]));
    const itemToMeta = Object.fromEntries((items     || []).map(i => [i.id, {
      skill:  i.primary_skill,
      accent: i.accent,
    }]));

    // ── Step 4: Weighted accuracy + per-skill / per-accent counts ─────────
    const cutoffMs = RECENCY_CUTOFF_DAYS * 24 * 60 * 60 * 1000;
    const nowMs    = Date.now();

    let weightedCorrect = 0;
    let weightedTotal   = 0;
    const skillStats  = {};  // { skillName: { correct, total } }
    const accentStats = {};  // { accentName: { correct, total } }

    for (const resp of responses) {
      const ageMs  = nowMs - new Date(resp.created_at).getTime();
      const weight = ageMs > cutoffMs ? RECENCY_WEIGHT_OLD : 1.0;

      weightedTotal   += weight;
      if (resp.is_correct) weightedCorrect += weight;

      const itemId = qToItemId[resp.question_id];
      const meta   = itemToMeta[itemId] ?? {};
      const skill  = meta.skill  ?? null;
      const accent = meta.accent ?? null;

      // Skill counts (unweighted — we want raw accuracy per skill)
      if (skill) {
        skillStats[skill] ??= { correct: 0, total: 0 };
        skillStats[skill].total++;
        if (resp.is_correct) skillStats[skill].correct++;
      }

      // Accent counts (unweighted)
      if (accent) {
        accentStats[accent] ??= { correct: 0, total: 0 };
        accentStats[accent].total++;
        if (resp.is_correct) accentStats[accent].correct++;
      }
    }

    // ── Step 5: Derived values ────────────────────────────────────────────
    const readinessScore = weightedTotal > 0
      ? Math.round((weightedCorrect / weightedTotal) * 100)
      : 0;

    const totalItemsAnswered = responses.length;
    const confidence = totalItemsAnswered >= CONFIDENCE_THRESHOLD ? 'stable' : 'provisional';

    /** Convert { correct, total } map → { skill: pct } */
    const toPct = (statsMap) =>
      Object.fromEntries(
        Object.entries(statsMap).map(([k, { correct, total }]) => [
          k, Math.round((correct / total) * 100),
        ])
      );

    const skillAccuracy  = toPct(skillStats);
    const accentAccuracy = toPct(accentStats);

    // Weakest / strongest among the four tracked skills (only those with data)
    const knownSkills = TRACKED_SKILLS.filter(s => skillAccuracy[s] !== undefined);
    const weakestSkill = knownSkills.length > 0
      ? knownSkills.reduce((w, s) => skillAccuracy[s] < skillAccuracy[w] ? s : w)
      : null;
    const strongestSkill = knownSkills.length > 1
      ? knownSkills.reduce((s, k) => skillAccuracy[k] > skillAccuracy[s] ? k : s)
      : (knownSkills[0] ?? null);

    // Weakest accent (only meaningful when we have ≥ 2 accent types)
    const accentKeys    = Object.keys(accentAccuracy);
    const weakestAccent = accentKeys.length > 1
      ? accentKeys.reduce((w, a) => accentAccuracy[a] < accentAccuracy[w] ? a : w)
      : (accentKeys[0] ?? null);

    // ── Step 6: Append to history (dedup same date, keep last 30) ─────────
    const nowIso = new Date().toISOString();
    const today  = nowIso.split('T')[0];

    const { data: current } = await sb
      .from('listening_user_state')
      .select('readiness_history')
      .eq('user_id', userId)
      .maybeSingle();

    const history = Array.isArray(current?.readiness_history)
      ? current.readiness_history
      : [];

    const filtered = history.filter(h => h.date !== today);
    filtered.push({ date: today, score: readinessScore });
    const trimmedHistory = filtered.slice(-MAX_HISTORY);

    // ── Step 7: Upsert listening_user_state ───────────────────────────────
    const newState = {
      user_id:              userId,
      readiness_score:      readinessScore,
      readiness_confidence: confidence,
      readiness_history:    trimmedHistory,
      total_items_answered: totalItemsAnswered,
      skill_accuracy:       skillAccuracy,
      accent_accuracy:      accentAccuracy,
      weakest_skill:        weakestSkill,
      strongest_skill:      strongestSkill,
      weakest_accent:       weakestAccent,
      updated_at:           nowIso,
    };

    const { error: uErr } = await sb
      .from('listening_user_state')
      .upsert(newState, { onConflict: 'user_id' });

    if (uErr) throw new Error('upsert: ' + uErr.message);

    console.log('[M6] readiness:', readinessScore, '|', confidence,
      '| skills:', skillAccuracy, '| accents:', accentAccuracy);

    return newState;

  } catch (err) {
    console.error('[M6] computeAndSaveReadiness failed:', err.message);
    return null;
  }
}
