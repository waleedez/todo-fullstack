import { query } from './db.js';

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email         text NOT NULL,
        password_hash text NOT NULL,
        created_at    timestamptz NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
        ON users (lower(email));

      CREATE TABLE IF NOT EXISTS todos (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       text NOT NULL,
        notes       text,
        completed   boolean NOT NULL DEFAULT false,
        priority    text NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high')),
        due_date    date,
        position    double precision NOT NULL DEFAULT 0,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS todos_user_position_idx
        ON todos (user_id, position);

      CREATE TABLE IF NOT EXISTS tags (
        id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name    text NOT NULL,
        color   text NOT NULL DEFAULT '#6366f1'
      );

      CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_key
        ON tags (user_id, lower(name));

      CREATE TABLE IF NOT EXISTS todo_tags (
        todo_id uuid NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
        tag_id  uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (todo_id, tag_id)
      );

      CREATE INDEX IF NOT EXISTS todo_tags_tag_idx ON todo_tags (tag_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = await query<{ name: string }>('SELECT name FROM schema_migrations');
  const done = new Set(applied.rows.map((row) => row.name));

  for (const migration of MIGRATIONS) {
    if (done.has(migration.name)) continue;
    await query('BEGIN');
    try {
      await query(migration.sql);
      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
      await query('COMMIT');
      console.log(`[db] applied migration ${migration.name}`);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
}
