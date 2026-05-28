import { json } from '@sveltejs/kit';
import { loadAllData, resetAll } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  return json(loadAllData());
};

export const DELETE: RequestHandler = () => {
  resetAll();
  return json({ ok: true });
};
