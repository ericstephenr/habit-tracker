import { json } from '@sveltejs/kit';
import { toggleCompletion, setCount } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  if ('count' in body) {
    setCount(body.habitId, body.date, body.count);
    return json({ ok: true });
  }
  const nowDone = toggleCompletion(body.habitId, body.date);
  return json({ done: nowDone });
};
