import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';
import { conflict, notFound } from '../errors.js';
import { createTagSchema, updateTagSchema } from '../validation.js';

export const tagsRouter = Router();

tagsRouter.use(requireAuth);

interface TagRow {
  id: string;
  name: string;
  color: string;
}

tagsRouter.get('/', async (req, res) => {
  const result = await query<TagRow>(
    `SELECT id, name, color
       FROM tags
      WHERE user_id = $1
      ORDER BY lower(name)`,
    [req.user!.id],
  );
  res.json({ tags: result.rows });
});

tagsRouter.post('/', async (req, res) => {
  const { name, color } = createTagSchema.parse(req.body);

  const duplicate = await query<{ id: string }>(
    'SELECT id FROM tags WHERE user_id = $1 AND lower(name) = lower($2)',
    [req.user!.id, name],
  );
  if (duplicate.rowCount && duplicate.rowCount > 0) {
    throw conflict('You already have a tag with that name');
  }

  const inserted = await query<TagRow>(
    `INSERT INTO tags (user_id, name, color)
     VALUES ($1, $2, COALESCE($3, '#6366f1'))
     RETURNING id, name, color`,
    [req.user!.id, name, color ?? null],
  );

  res.status(201).json({ tag: inserted.rows[0] });
});

tagsRouter.patch('/:id', async (req, res) => {
  const { name, color } = updateTagSchema.parse(req.body);

  if (name) {
    const duplicate = await query<{ id: string }>(
      'SELECT id FROM tags WHERE user_id = $1 AND lower(name) = lower($2) AND id <> $3',
      [req.user!.id, name, req.params.id],
    );
    if (duplicate.rowCount && duplicate.rowCount > 0) {
      throw conflict('You already have a tag with that name');
    }
  }

  const updated = await query<TagRow>(
    `UPDATE tags
        SET name  = COALESCE($3, name),
            color = COALESCE($4, color)
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, color`,
    [req.params.id, req.user!.id, name ?? null, color ?? null],
  );

  if (!updated.rowCount) throw notFound('Tag not found');
  res.json({ tag: updated.rows[0] });
});

tagsRouter.delete('/:id', async (req, res) => {
  const deleted = await query(
    'DELETE FROM tags WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id],
  );
  if (!deleted.rowCount) throw notFound('Tag not found');
  res.status(204).end();
});
