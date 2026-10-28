import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { closePool, query } from '../db.js';
import { runMigrations } from '../migrate.js';

let app: Express;
let agent: ReturnType<typeof request.agent>;

const email = `test-${Date.now()}@example.com`;
const password = 'password123';

beforeAll(async () => {
  await runMigrations();
  app = createApp();
  agent = request.agent(app);
});

afterAll(async () => {
  await query('DELETE FROM users WHERE email = $1', [email]);
  await closePool();
});

describe('auth', () => {
  it('rejects unauthenticated access to todos', async () => {
    const response = await request(app).get('/api/todos');
    expect(response.status).toBe(401);
  });

  it('registers a user and starts a session', async () => {
    const response = await agent.post('/api/auth/register').send({ email, password });
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(email);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it('rejects a duplicate registration', async () => {
    const response = await agent.post('/api/auth/register').send({ email, password });
    expect(response.status).toBe(409);
  });

  it('rejects a weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@example.com', password: 'short' });
    expect(response.status).toBe(400);
  });

  it('rejects a wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });
    expect(response.status).toBe(401);
  });
});

describe('todos', () => {
  let tagId: string;
  let todoId: string;

  it('creates a tag', async () => {
    const response = await agent.post('/api/tags').send({ name: 'Work', color: '#ef4444' });
    expect(response.status).toBe(201);
    tagId = response.body.tag.id;
  });

  it('creates a todo with a tag', async () => {
    const response = await agent.post('/api/todos').send({
      title: 'Ship the app',
      priority: 'high',
      dueDate: '2026-11-01',
      tagIds: [tagId],
    });

    expect(response.status).toBe(201);
    expect(response.body.todo).toMatchObject({
      title: 'Ship the app',
      priority: 'high',
      dueDate: '2026-11-01',
      completed: false,
    });
    expect(response.body.todo.tags).toHaveLength(1);
    todoId = response.body.todo.id;
  });

  it('rejects an empty title', async () => {
    const response = await agent.post('/api/todos').send({ title: '   ' });
    expect(response.status).toBe(400);
  });

  it('rejects a tag that does not exist', async () => {
    const response = await agent
      .post('/api/todos')
      .send({ title: 'Bad tag', tagIds: ['00000000-0000-4000-8000-000000000000'] });
    expect(response.status).toBe(400);
  });

  it('lists todos for the current user', async () => {
    const response = await agent.get('/api/todos');
    expect(response.status).toBe(200);
    expect(response.body.todos).toHaveLength(1);
  });

  it('updates completion state', async () => {
    const response = await agent.patch(`/api/todos/${todoId}`).send({ completed: true });
    expect(response.status).toBe(200);
    expect(response.body.todo.completed).toBe(true);
  });

  it('reorders todos', async () => {
    const second = await agent.post('/api/todos').send({ title: 'Second task' });
    const secondId = second.body.todo.id;

    const response = await agent
      .patch('/api/todos/reorder')
      .send({ orderedIds: [secondId, todoId] });

    expect(response.status).toBe(200);
    expect(response.body.todos.map((todo: { id: string }) => todo.id)).toEqual([secondId, todoId]);
  });

  it('deletes a todo', async () => {
    const response = await agent.delete(`/api/todos/${todoId}`);
    expect(response.status).toBe(204);

    const list = await agent.get('/api/todos');
    expect(list.body.todos).toHaveLength(1);
  });

  it('returns 404 for an unknown todo', async () => {
    const response = await agent
      .patch('/api/todos/00000000-0000-4000-8000-000000000000')
      .send({ completed: true });
    expect(response.status).toBe(404);
  });
});

describe('isolation', () => {
  it('does not expose another user todos', async () => {
    const otherEmail = `other-${Date.now()}@example.com`;
    const other = request.agent(app);
    await other.post('/api/auth/register').send({ email: otherEmail, password });

    const list = await other.get('/api/todos');
    expect(list.body.todos).toHaveLength(0);

    await query('DELETE FROM users WHERE email = $1', [otherEmail]);
  });
});
