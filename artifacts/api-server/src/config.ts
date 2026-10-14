import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load the single root .env regardless of the process working directory (the app
// runs from artifacts/api-server). In Docker the file is absent and env is
// injected by docker-compose, which dotenv leaves untouched.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

function nonNegativeInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isInteger(n) && n >= 0 ? n : fallback;
}

export default {
  // Branding — configurable so any restaurant can rebrand without code changes.
  // Consumed by pages/theme.ts (BRAND) and surfaced on the customer header,
  // receipt, and page titles.
  BRAND_NAME: process.env.BRAND_NAME || 'The Corner Table',
  BRAND_TAGLINE: process.env.BRAND_TAGLINE || 'Scan · Order · Enjoy',

  // Currency configuration
  CURRENCY_SYMBOL: process.env.CURRENCY_SYMBOL || 'QAR',
  CURRENCY_CODE: process.env.CURRENCY_CODE || 'QAR',

  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000'),
  HOST: process.env.SERVER_HOST || '0.0.0.0',
  // Number of reverse proxies in front of the app (e.g. 1 on most hosting platforms).
  // Leave empty when the app is reached directly.
  TRUST_PROXY: process.env.TRUST_PROXY || '',
  // Days to keep customer names and phone numbers on orders. 0 keeps them forever.
  PII_RETENTION_DAYS: nonNegativeInt(process.env.PII_RETENTION_DAYS, 90),
  // Chat messages allowed per minute from one IP address, on top of the per-session limit.
  AI_CHAT_IP_LIMIT_PER_MIN: nonNegativeInt(process.env.AI_CHAT_IP_LIMIT_PER_MIN, 120) || 120,

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET!,
  SESSION_TIMEOUT_HOURS: parseInt(process.env.SESSION_TIMEOUT_HOURS || '8'),

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5000',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Web Push (VAPID)
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@restaurant.local',

  // Internal service auth — shared secret between Express and Python AI service
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET || '',

  // URL of the Python AI microservice — differs between local dev and Docker
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8001',

  // Default credentials — must be set via environment variables
  DEFAULT_ADMIN_USERNAME: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || '',
  DEFAULT_KITCHEN_USERNAME: process.env.DEFAULT_KITCHEN_USERNAME || 'kitchen',
  DEFAULT_KITCHEN_PASSWORD: process.env.DEFAULT_KITCHEN_PASSWORD || '',
  DEFAULT_WAITER_USERNAME: process.env.DEFAULT_WAITER_USERNAME || 'waiter',
  DEFAULT_WAITER_PASSWORD: process.env.DEFAULT_WAITER_PASSWORD || '',
};
