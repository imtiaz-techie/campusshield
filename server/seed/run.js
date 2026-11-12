/**
 * npm run seed  -> wipes the database in MONGODB_URI and inserts fresh demo data.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { seedAll, DEMO_PASSWORDS } from './seed.js';

if (!env.mongoUri) {
  console.error('MONGODB_URI is not set. Create a .env file (see .env.example).');
  console.error('Tip: without MONGODB_URI, "npm run dev" uses an in-memory DB that is seeded automatically.');
  process.exit(1);
}

try {
  await mongoose.connect(env.mongoUri);
  const result = await seedAll();
  console.log('Seed complete:', result);
  console.log('Demo logins:');
  console.log(`  Student : student@diu.edu.bd / ${DEMO_PASSWORDS.student}`);
  console.log(`  Security: security@diu.edu.bd / ${DEMO_PASSWORDS.security}`);
  console.log(`  Admin   : admin@diu.edu.bd / ${DEMO_PASSWORDS.admin}`);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
