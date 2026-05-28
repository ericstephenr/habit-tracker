import { json } from '@sveltejs/kit';
import { insertTodoSection } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const section = await request.json();
  insertTodoSection(section);
  return json({ ok: true }, { status: 201 });
};
