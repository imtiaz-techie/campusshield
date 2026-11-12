import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

if (!process.env.JWT_SECRET) {
  console.warn('[CampusShield] JWT_SECRET is not set. Using an insecure development fallback. Set JWT_SECRET in production!');
}

export const env = {
  isProd,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'campusshield-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  autoSeed: (process.env.AUTO_SEED || 'true').toLowerCase() !== 'false',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
