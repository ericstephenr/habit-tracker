import { json } from '@sveltejs/kit';
import { clearHistoryBefore } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ request }) => {
  const { dateCutoff } = await request.json();
  if (typeof dateCutoff !== 'string') {
    return json({ error: 'dateCutoff required' }, { status: 400 });
  }
  clearHistoryBefore(dateCutoff);
  return json({ ok: true });
};
