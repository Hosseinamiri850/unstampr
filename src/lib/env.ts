function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface AppEnv {
  APP_URL: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_BUCKET: string;
  MAX_IMAGE_SIZE: number;
  MAX_VIDEO_SIZE: number;
  MAX_VIDEO_DURATION: number;
  FILE_RETENTION_HOURS: number;
  CREDITS_PER_IMAGE: number;
  CREDITS_PER_VIDEO_10_SECONDS: number;
  ANON_FREE_CREDITS: number;
  FREE_DAILY_JOBS: number;
  WORKER_CONCURRENCY: number;
  PROCESSING_BACKEND: string;
  QUEUE_NAME: string;
  PAYMENTS_ENABLED: boolean;
  ZARINPAL_MERCHANT_ID: string;
  ZARINPAL_CALLBACK_URL: string;
  ZARINPAL_SANDBOX: boolean;
  BALE_BOT_TOKEN: string;
  BALE_PROVIDER_TOKEN: string;
  BALE_WEBHOOK_SECRET: string;
  BALE_WEBHOOK_ENABLED: boolean;
  BALE_INVOICE_TTL_SEC: number;
  BALE_LINK_CODE_TTL_SEC: number;
  RECONCILE_TOKEN: string;
  SESSION_SECRET: string;
}

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  cached = {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://pakino:pakino@localhost:5432/pakino',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    S3_REGION: process.env.S3_REGION ?? 'us-east-1',
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? '',
    S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? '',
    S3_BUCKET: process.env.S3_BUCKET ?? 'pakino',
    MAX_IMAGE_SIZE: num('MAX_IMAGE_SIZE', 10 * 1024 * 1024),
    MAX_VIDEO_SIZE: num('MAX_VIDEO_SIZE', 500 * 1024 * 1024),
    MAX_VIDEO_DURATION: num('MAX_VIDEO_DURATION', 300),
    FILE_RETENTION_HOURS: num('FILE_RETENTION_HOURS', 24),
    CREDITS_PER_IMAGE: num('CREDITS_PER_IMAGE', 5),
    CREDITS_PER_VIDEO_10_SECONDS: num('CREDITS_PER_VIDEO_10_SECONDS', 10),
    ANON_FREE_CREDITS: num('ANON_FREE_CREDITS', 50),
    FREE_DAILY_JOBS: num('FREE_DAILY_JOBS', 5),
    WORKER_CONCURRENCY: num('WORKER_CONCURRENCY', 2),
    PROCESSING_BACKEND: process.env.PROCESSING_BACKEND ?? 'opencv',
    QUEUE_NAME: process.env.QUEUE_NAME ?? 'pakino:jobs',
    PAYMENTS_ENABLED: process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true',
    ZARINPAL_MERCHANT_ID: process.env.ZARINPAL_MERCHANT_ID ?? '',
    ZARINPAL_CALLBACK_URL: process.env.ZARINPAL_CALLBACK_URL ?? 'http://localhost:3000/api/payments/callback',
    ZARINPAL_SANDBOX: process.env.ZARINPAL_SANDBOX !== 'false',
    BALE_BOT_TOKEN: process.env.BALE_BOT_TOKEN ?? '',
    BALE_PROVIDER_TOKEN: process.env.BALE_PROVIDER_TOKEN ?? '',
    BALE_WEBHOOK_SECRET: process.env.BALE_WEBHOOK_SECRET ?? '',
    BALE_WEBHOOK_ENABLED: process.env.BALE_WEBHOOK_ENABLED === 'true',
    BALE_INVOICE_TTL_SEC: num('BALE_INVOICE_TTL_SEC', 30 * 60),
    BALE_LINK_CODE_TTL_SEC: num('BALE_LINK_CODE_TTL_SEC', 15 * 60),
    RECONCILE_TOKEN: process.env.RECONCILE_TOKEN ?? '',
    SESSION_SECRET: process.env.SESSION_SECRET ?? 'dev-only-change-me-please-32-bytes!',
  };
  return cached;
}
