import { json } from '@sveltejs/kit';
import { updateTodo, deleteTodo } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const patch = await request.json();
  updateTodo(params.id, patch);
  return json({ ok: true });
};

export const DELETE: RequestHandler = ({ params }) => {
  deleteTodo(params.id);
  return json({ ok: true });
};
