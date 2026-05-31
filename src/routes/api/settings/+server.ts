import { json, error } from '@sveltejs/kit';
import { updateSettings } from '$lib/server/db';
import type { RequestHandler } from './$types';

const MAX_GRACE_DAYS = 30;

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const patch: { enabled?: boolean; graceDays?: number } = {};
  if ('enabled' in body) {
    if (typeof body.enabled !== 'boolean') throw error(400, 'enabled must be a boolean');
    patch.enabled = body.enabled;
  }
  if ('graceDays' in body) {
    const g = body.graceDays;
    if (typeof g !== 'number' || !Number.isInteger(g) || g < 0 || g > MAX_GRACE_DAYS) {
      throw error(400, `graceDays must be an integer between 0 and ${MAX_GRACE_DAYS}`);
    }
    patch.graceDays = g;
  }
  return json(updateSettings(patch));
};
