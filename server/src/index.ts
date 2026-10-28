import { createApp } from './app.js';
import { config } from './config.js';
import { closePool } from './db.js';
import { runMigrations } from './migrate.js';

async function main(): Promise<void> {
  await runMigrations();

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`[server] listening on http://localhost:${config.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[server] failed to start', error);
  process.exit(1);
});
