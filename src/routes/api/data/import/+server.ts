import { json } from '@sveltejs/kit';
import { importData } from '$lib/server/db';
import { migrate } from '$lib/storage';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const data = migrate(body);
  if (!data) {
    return json({ error: 'Invalid data format' }, { status: 400 });
  }
  importData(data);
  return json({ ok: true });
};
