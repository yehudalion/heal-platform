# פרומפט תמלול לג'מיני — 24 הקלטות המרכז הארצי

## הוראות שימוש (ליאון)
1. פתח צ'אט חדש ב-Gemini (מומלץ 2.5 Pro / AI Studio).
2. העלה **עד 5 הקלטות בכל סבב** (כדי לשמור על דיוק), מהתיקייה
   `docs/truth_corpus/recordings/`.
3. הדבק את הפרומפט שמתחת לקו.
4. הדבק לי בחזרה את הפלט של כל סבב כמו שהוא — אל תערוך.

---

Transcribe each attached audio file **verbatim** and completely. These are short
English listening-comprehension recordings (single narrator or two speakers).

Output format — for EACH file, exactly this structure:

```
=== FILE: <exact file name> ===
SPEAKERS: <1 or 2; if 2, note male/female>
TRANSCRIPT:
<full verbatim transcript. For two speakers, label turns "M:" and "F:".
Mark pauses longer than ~1 second as [pause].
If the recording ends with an electronic tone, write [TONE] at that point.
Write numbers exactly as spoken (e.g. "three hundred hours", not "300").
Preserve every false start or repeated word if any occur.>
NOTES: <anything unusual: internal long pause, false start, audio artifacts>
```

Rules:
- Do NOT summarize, translate, or correct grammar — verbatim only.
- Do NOT skip filler words.
- British vs American spelling: spell words the way standard British English
  would (colour, programme) only when the word itself is ambiguous in audio;
  otherwise standard spelling.
- If a word is genuinely unintelligible, write [unclear].
