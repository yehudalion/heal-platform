# Workspace

## Overview

pnpm workspace monorepo. Contains the HEAL vocabulary study app (vanilla HTML/CSS/JS) and shared scaffolding.

## Apps

- **HEAL** — `artifacts/heal/` — vanilla HTML + CSS + ES module JavaScript, served by Vite. Uses Supabase for auth (Google OAuth + email magic link) and persistent rating storage. Guest mode falls back to `localStorage`. Dark-navy + white academic design.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **HEAL frontend**: vanilla JS + Vite, no framework
- **Auth + DB**: Supabase (`@supabase/supabase-js`)

## Required Secrets (HEAL)

Set in the Replit Secrets tab (or via the agent secrets request flow):

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon (public) key

## Supabase setup (one-time, in the Supabase SQL editor)

```sql
create table if not exists ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  word_id text not null,
  rating text not null check (rating in ('easy','medium','hard')),
  created_at timestamptz default now(),
  unique (user_id, word_id)
);

alter table ratings enable row level security;

create policy "users see own ratings" on ratings
  for select using (auth.uid() = user_id);
create policy "users insert own ratings" on ratings
  for insert with check (auth.uid() = user_id);
create policy "users update own ratings" on ratings
  for update using (auth.uid() = user_id);
```

In **Authentication → URL Configuration** in Supabase, add the dev URL (`https://<your-replit-domain>/`) and (after publishing) the production URL to the list of allowed redirect URLs. Enable Google OAuth and email magic links under **Authentication → Providers**.

## Key Commands

- `pnpm --filter @workspace/heal run dev` — run HEAL locally (handled by the workflow)
- `pnpm --filter @workspace/heal run build` — production build
