import { json, error } from '@sveltejs/kit';
import { bulkSetState } from '$lib/server/db';
import type { CompletionState } from '$lib/types';
import type { RequestHandler } from './$types';

const VALID_STATES = new Set<CompletionState>(['skipped', 'failed']);

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  if (!Array.isArray(body.entries)) throw error(400, 'entries must be an array');
  const entries: { habitId: string; date: string; state: CompletionState }[] = [];
  for (const e of body.entries) {
    if (
      typeof e?.habitId !== 'string' ||
      typeof e?.date !== 'string' ||
      !VALID_STATES.has(e?.state)
    ) {
      throw error(400, 'each entry needs habitId, date, and a valid state');
    }
    entries.push({ habitId: e.habitId, date: e.date, state: e.state });
  }
  bulkSetState(entries);
  return json({ ok: true, count: entries.length });
};
