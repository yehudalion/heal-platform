// Harness — מריץ את האפליקציה עם Supabase מזויף לבדיקות ויזואליות (Playwright):
//   npx vite --config harness/vite.config.mjs   →  http://127.0.0.1:5199/#/schedule
// לא חלק מהבילד. supabase.stub.js מחזיר נתוני דמו קבועים.
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export default defineConfig({
  root,
  publicDir: path.join(root, 'public'),
  resolve: { alias: [{ find: /^(.*)\/supabase\.js$/, replacement: path.join(root, 'harness/supabase.stub.js') }] },
  server: { port: 5199, host: '127.0.0.1', strictPort: true },
});
