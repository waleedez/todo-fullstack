import { Router } from 'express';
import type pg from 'pg';
import { requireAuth } from '../auth.js';
import { query, withTransaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import {
  createTodoSchema,
  reorderSchema,
  updateTodoSchema,
  type CreateTodoInput,
  type UpdateTodoInput,
} from '../validation.js';

export const todosRouter = Router();

todosRouter.use(requireAuth);

interface TodoRow {
  id: string;
  title: string;
  notes: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: Date | string | null;
  position: number;
  created_at: Date;
  updated_at: Date;
  tags: { id: string; name: string; color: string }[] | null;
}

const TODO_SELECT = `
  SELECT t.id,
         t.title,
         t.notes,
         t.completed,
         t.priority,
         t.due_date,
         t.position,
         t.created_at,
         t.updated_at,
         COALESCE(
           (
             SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'color', g.color)
                             ORDER BY lower(g.name))
               FROM todo_tags tt
               JOIN tags g ON g.id = tt.tag_id
              WHERE tt.todo_id = t.id
           ),
           '[]'::json
         ) AS tags
    FROM todos t
`;

function toDateOnly(value: Date | string | null): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function serializeTodo(row: TodoRow) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    completed: row.completed,
    priority: row.priority,
    dueDate: toDateOnly(row.due_date),
    position: row.position,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    tags: row.tags ?? [],
  };
}

async function assertTagsOwned(
  client: pg.PoolClient | null,
  userId: string,
  tagIds: string[],
): Promise<void> {
  if (tagIds.length === 0) return;
  const unique = [...new Set(tagIds)];
  const sql = 'SELECT id FROM tags WHERE user_id = $1 AND id = ANY($2::uuid[])';
  const result = client
    ? await client.query<{ id: string }>(sql, [userId, unique])
    : await query<{ id: string }>(sql, [userId, unique]);

  if (result.rowCount !== unique.length) {
    throw badRequest('One or more tags do not exist');
  }
}

async function replaceTodoTags(
  client: pg.PoolClient,
  todoId: string,
  tagIds: string[],
): Promise<void> {
  await client.query('DELETE FROM todo_tags WHERE todo_id = $1', [todoId]);
  const unique = [...new Set(tagIds)];
  if (unique.length === 0) return;
  await client.query(
    `INSERT INTO todo_tags (todo_id, tag_id)
     SELECT $1, unnest($2::uuid[])`,
    [todoId, unique],
  );
}

async function loadTodo(userId: string, id: string) {
  const result = await query<TodoRow>(`${TODO_SELECT} WHERE t.user_id = $1 AND t.id = $2`, [
    userId,
    id,
  ]);
  const row = result.rows[0];
  if (!row) throw notFound('Todo not found');
  return serializeTodo(row);
}

todosRouter.get('/', async (req, res) => {
  const result = await query<TodoRow>(
    `${TODO_SELECT} WHERE t.user_id = $1 ORDER BY t.position, t.created_at`,
    [req.user!.id],
  );
  res.json({ todos: result.rows.map(serializeTodo) });
});

todosRouter.post('/', async (req, res) => {
  const input: CreateTodoInput = createTodoSchema.parse(req.body);
  const tagIds = input.tagIds ?? [];

  const todo = await withTransaction(async (client) => {
    await assertTagsOwned(client, req.user!.id, tagIds);

    const next = await client.query<{ next: number }>(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM todos WHERE user_id = $1',
      [req.user!.id],
    );

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO todos (user_id, title, notes, priority, due_date, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        req.user!.id,
        input.title,
        input.notes ?? null,
        input.priority,
        input.dueDate ?? null,
        next.rows[0].next,
      ],
    );

    const id = inserted.rows[0].id;
    await replaceTodoTags(client, id, tagIds);
    return id;
  });

  res.status(201).json({ todo: await loadTodo(req.user!.id, todo) });
});

todosRouter.patch('/reorder', async (req, res) => {
  const { orderedIds } = reorderSchema.parse(req.body);

  await withTransaction(async (client) => {
    const owned = await client.query<{ id: string }>(
      'SELECT id FROM todos WHERE user_id = $1 AND id = ANY($2::uuid[])',
      [req.user!.id, orderedIds],
    );
    if (owned.rowCount !== new Set(orderedIds).size) {
      throw badRequest('One or more todos do not exist');
    }

    for (const [index, id] of orderedIds.entries()) {
      await client.query('UPDATE todos SET position = $3 WHERE id = $1 AND user_id = $2', [
        id,
        req.user!.id,
        index + 1,
      ]);
    }
  });

  const result = await query<TodoRow>(
    `${TODO_SELECT} WHERE t.user_id = $1 ORDER BY t.position, t.created_at`,
    [req.user!.id],
  );
  res.json({ todos: result.rows.map(serializeTodo) });
});

todosRouter.patch('/:id', async (req, res) => {
  const input: UpdateTodoInput = updateTodoSchema.parse(req.body);

  await withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM todos WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id],
    );
    if (!existing.rowCount) throw notFound('Todo not found');

    if (input.tagIds) {
      await assertTagsOwned(client, req.user!.id, input.tagIds);
    }

    const sets: string[] = [];
    const values: unknown[] = [req.params.id, req.user!.id];

    const push = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (input.title !== undefined) push('title', input.title);
    if (input.notes !== undefined) push('notes', input.notes ?? null);
    if (input.completed !== undefined) push('completed', input.completed);
    if (input.priority !== undefined) push('priority', input.priority);
    if (input.dueDate !== undefined) push('due_date', input.dueDate ?? null);

    if (sets.length > 0) {
      await client.query(
        `UPDATE todos
            SET ${sets.join(', ')}, updated_at = now()
          WHERE id = $1 AND user_id = $2`,
        values,
      );
    }

    if (input.tagIds) {
      await replaceTodoTags(client, req.params.id, input.tagIds);
    }
  });

  res.json({ todo: await loadTodo(req.user!.id, req.params.id) });
});

todosRouter.delete('/:id', async (req, res) => {
  const deleted = await query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user!.id,
  ]);
  if (!deleted.rowCount) throw notFound('Todo not found');
  res.status(204).end();
});
