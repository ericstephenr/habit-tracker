import { json } from '@sveltejs/kit';
import { toggleCompletion, setCount, setState, deleteCompletion } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  if (body.delete === true) {
    deleteCompletion(body.habitId, body.date);
    return json({ ok: true });
  }
  if ('state' in body) {
    setState(body.habitId, body.date, body.state);
    return json({ ok: true });
  }
  if ('count' in body) {
    setCount(body.habitId, body.date, body.count);
    return json({ ok: true });
  }
  const nowDone = toggleCompletion(body.habitId, body.date);
  return json({ done: nowDone });
};
