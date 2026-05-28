import { json } from '@sveltejs/kit';
import { commitHabitLayout } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
  const { groups } = await request.json();
  commitHabitLayout(groups);
  return json({ ok: true });
};
