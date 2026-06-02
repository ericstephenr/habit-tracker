import { json } from '@sveltejs/kit';
import { insertNote } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const note = await request.json();
  insertNote(note);
  return json({ ok: true }, { status: 201 });
};
