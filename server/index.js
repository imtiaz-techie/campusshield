/**
 * Local development server. On Vercel the same Express app runs as a
 * serverless function from /api/index.js.
 */
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, setDatabaseUri } from './config/db.js';

async function start() {
  if (!env.mongoUri) {
    // No MONGODB_URI: start a throwaway in-memory MongoDB for local demos.
    console.log('[CampusShield] MONGODB_URI not set: starting in-memory MongoDB (data resets on restart)...');
    const { MongoMemoryServer } = await import('mongodb-memory-server-core');
    const mem = await MongoMemoryServer.create();
    setDatabaseUri(mem.getUri('campusshield'));
  }
  await connectDB();
  app.listen(env.port, () => console.log(`[CampusShield] API ready on http://localhost:${env.port}`));
}

start().catch((err) => {
  console.error('[CampusShield] Failed to start:', err.message);
  process.exit(1);
});
