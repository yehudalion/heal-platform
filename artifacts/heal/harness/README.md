# harness — בדיקה ויזואלית בלי חשבון

`npx vite --config harness/vite.config.mjs` ואז `http://127.0.0.1:5199/#/schedule`.
כל `import '../supabase.js'` מוחלף ב-`supabase.stub.js` שמחזיר משתמש מחובר ונתוני דמו קבועים.
נועד לצילומי מסך ולבדיקות פריסה; לא נכנס לבילד.
