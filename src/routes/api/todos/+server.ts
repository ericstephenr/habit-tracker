import { json } from '@sveltejs/kit';
import { insertTodo } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const todo = await request.json();
  insertTodo(todo);
  return json({ ok: true }, { status: 201 });
};
