import { json } from '@sveltejs/kit';
import { insertSection } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const section = await request.json();
  insertSection(section);
  return json({ ok: true }, { status: 201 });
};
