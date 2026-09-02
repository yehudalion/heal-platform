/**
 * src/lib/modules.js — the ONE place that says which modules are live.
 *
 * Built 2026-08-25. Before this file, "is Sentence Completion open yet?" was
 * answered independently by layout.js (nav badge), home.js (locked tile) and
 * the router — three hard-coded copies that were already drifting: the SC
 * build going on in a parallel chat flips home.js to live while the sidebar
 * still says בקרוב. From now on: SHIPPING A MODULE = FLIPPING ITS status HERE,
 * and every surface that renders module state must read this registry.
 *
 * layout.js (sidebar) reads it as of today. home.js should be wired to it in
 * the Sentence Completion chat's branch of work — see claude/BACKLOG_next.md.
 */

export const MODULES = [
  { id: 'listening', label: 'האזנה',          route: '/listening',           status: 'live' },
  { id: 'vocab',     label: 'אוצר מילים',      route: '/flashcards',          status: 'live' },
  { id: 'rephrase',  label: 'ניסוח מחדש',      route: '/rephrasing',          status: 'live' },
  { id: 'sc',        label: 'השלמת משפטים',    route: '/sentence-completion', status: 'live' },
  { id: 'reading',   label: 'הבנת הנקרא',      route: '/reading',             status: 'live' },
];

export function getModule(id) {
  return MODULES.find(m => m.id === id) || null;
}

export function isLive(id) {
  return getModule(id)?.status === 'live';
}
