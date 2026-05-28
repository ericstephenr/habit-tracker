import { json } from '@sveltejs/kit';
import { updateHabit, deleteHabit } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const patch = await request.json();
  updateHabit(params.id, patch);
  return json({ ok: true });
};

export const DELETE: RequestHandler = ({ params }) => {
  deleteHabit(params.id);
  return json({ ok: true });
};
