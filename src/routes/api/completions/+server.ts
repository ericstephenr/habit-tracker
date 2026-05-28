import { json, error } from '@sveltejs/kit';
import {
  toggleCompletion,
  setCount,
  setState,
  deleteCompletion,
  setTargetOverride
} from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  if (body.delete === true) {
    deleteCompletion(body.habitId, body.date);
    return json({ ok: true });
  }
  if ('targetOverride' in body) {
    const v = body.targetOverride;
    if (v === null) {
      setTargetOverride(body.habitId, body.date, null);
    } else if (typeof v === 'number' && Number.isInteger(v) && v >= 1) {
      setTargetOverride(body.habitId, body.date, v);
    } else {
      throw error(400, 'targetOverride must be a positive integer or null');
    }
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
