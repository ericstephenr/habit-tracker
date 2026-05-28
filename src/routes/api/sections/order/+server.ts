import { json } from '@sveltejs/kit';
import { reorderSections } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
  const { ids } = await request.json();
  reorderSections(ids);
  return json({ ok: true });
};
