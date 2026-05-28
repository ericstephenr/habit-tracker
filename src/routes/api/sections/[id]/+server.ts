import { json } from '@sveltejs/kit';
import { updateSection, deleteSection } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const patch = await request.json();
  updateSection(params.id, patch);
  return json({ ok: true });
};

export const DELETE: RequestHandler = ({ params }) => {
  const fallback = deleteSection(params.id);
  if (fallback === null) {
    return json({ error: 'Cannot delete last section' }, { status: 400 });
  }
  return json({ ok: true, fallbackId: fallback });
};
