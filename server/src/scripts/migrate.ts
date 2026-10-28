import { closePool } from '../db.js';
import { runMigrations } from '../migrate.js';

runMigrations()
  .then(async () => {
    console.log('[migrate] done');
    await closePool();
  })
  .catch(async (error) => {
    console.error('[migrate] failed', error);
    await closePool();
    process.exit(1);
  });
