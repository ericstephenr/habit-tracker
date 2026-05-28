import { json } from '@sveltejs/kit';
import { commitTodoLayout } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
  const { groups, todoSectionIds } = await request.json();
  commitTodoLayout(groups, todoSectionIds);
  return json({ ok: true });
};
