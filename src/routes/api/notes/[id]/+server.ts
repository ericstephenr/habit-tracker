import { json } from '@sveltejs/kit';
import { updateNote, deleteNote } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const patch = await request.json();
  updateNote(params.id, patch);
  return json({ ok: true });
};

export const DELETE: RequestHandler = ({ params }) => {
  deleteNote(params.id);
  return json({ ok: true });
};
