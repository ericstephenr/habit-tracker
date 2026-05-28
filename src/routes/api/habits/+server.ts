import { json } from '@sveltejs/kit';
import { insertHabit } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const habit = await request.json();
  insertHabit(habit);
  return json({ ok: true }, { status: 201 });
};
