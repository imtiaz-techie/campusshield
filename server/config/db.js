import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);
// NoSQL-injection protection is handled by the sanitizeRequest middleware (strips "$" / "." keys).

// Cache the connection across serverless invocations (Vercel).
const cached = globalThis.__campusshieldDb || (globalThis.__campusshieldDb = { conn: null, promise: null, uri: '' });

export function setDatabaseUri(uri) {
  cached.uri = uri;
}

export async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  const uri = cached.uri || env.mongoUri;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured. Add it to your environment variables.');
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 })
      .then(async (m) => {
        if (env.autoSeed) {
          const { seedIfEmpty } = await import('../seed/seed.js');
          await seedIfEmpty();
        }
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
