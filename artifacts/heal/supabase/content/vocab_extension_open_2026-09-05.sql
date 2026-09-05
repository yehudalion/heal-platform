-- שבת 4/6 (5.9.2026): פתיחת מילות ההרחבה מעל C1 (לא במבחנים) למאגר הליבה.
-- שיטה: HANDOFF_vocab_stageC_done_2026-09-04.md §4 — impact = 0.2749*evidence + 2.4631, clamp [4.91, 53.30];
-- percentile = percent_rank מול 543 המילים המקוריות. תיעוד: claude/HANDOFF_vocab_extension_open.md
-- אידמפוטנטי: נוגע רק בשורות עם impact_score IS NULL.
with tgt as (
  select id, least(53.30, greatest(4.91, 0.2749*coalesce(evidence_score,0) + 2.4631)) as sc
  from words
  where status='pending_review' and cefr_band in ('off~C1+','off~C2')
    and coalesce(exams_any_role,0)=0 and impact_score is null
    and definition_he is not null and surface_1 is not null and mnemonic is not null and audio_word_url is not null
), base as (select impact_score from words where impact_percentile is not null)
update words w set
  impact_score = t.sc,
  impact_percentile = round(((select count(*) from base b where b.impact_score < t.sc)::numeric / (select count(*) from base)) * 100, 2),
  updated_at = now()
from tgt t where w.id = t.id;
-- rollback:
-- update words set impact_score=null, impact_percentile=null where status='pending_review' and impact_score=4.91 and impact_percentile=0 and coalesce(exams_any_role,0)=0 and cefr_band in ('off~C1+','off~C2');
