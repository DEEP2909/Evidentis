/**
 * EvidentIS India API Configuration
 * India-first environment configuration with DPDP, Razorpay, MSG91,
 * IndiaKanoon, eCourts, and data-localisation defaults.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../.env'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const isProductionEnv = process.env.NODE_ENV === 'production';
const DEV_APP_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const configSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().default(4000),
    HOST: z.string().default('0.0.0.0'),

    JWT_PRIVATE_KEY_PATH: z.string().default('./keys/private.pem'),
    JWT_PUBLIC_KEY_PATH: z.string().default('./keys/public.pem'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(7),
    JWT_ISSUER: z.string().default('evidentis-india'),
    JWT_AUDIENCE: z.string().default('evidentis-india-api'),

    APP_ENCRYPTION_KEY: z.string().optional(),
    APP_ENCRYPTION_KEY_FILE: z.string().optional(),

    DATABASE_URL: z.string().url(),
    DB_POOL_MAX: z.coerce.number().default(10),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
    DB_CONNECT_TIMEOUT_MS: z.coerce.number().default(5000),
    DB_SSL: z.enum(['true', 'false']).default('false'),
    DB_SSL_CA: z.string().optional(),

    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    REDIS_DB_QUEUE: z.coerce.number().default(0),
    REDIS_DB_CACHE: z.coerce.number().default(3),

    STORAGE_BACKEND: z.enum(['local', 's3']).default('local'),
    LOCAL_STORAGE_PATH: z.string().default('./storage'),
    S3_REGION: z.string().default('centralindia'),
    S3_BUCKET: z.string().default('evidentis-india-documents'),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'),

    AI_SERVICE_URL: z.string().url().default('http://localhost:5000'),
    AI_SERVICE_TIMEOUT_MS: z.coerce.number().default(180000),
    AI_SERVICE_INTERNAL_KEY: z.string().optional(),

    MALWARE_SCANNER: z.enum(['clamav', 'none']).default('clamav'),
    CLAMAV_HOST: z.string().default('localhost'),
    CLAMAV_PORT: z.coerce.number().default(3310),

    EMAIL_DELIVERY_MODE: z.enum(['log', 'smtp']).default('log'),
    MAIL_FROM: z.string().email().default('noreply@evidentis.tech'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z.enum(['true', 'false']).default('false'),

    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    INDIANKANOON_API_KEY: z.string().optional(),
    INDIANKANOON_BASE_URL: z
      .string()
      .url()
      .default('https://api.indiankanoon.org'),

    ECOURTS_API_KEY: z.string().optional(),
    ECOURTS_BASE_URL: z
      .string()
      .url()
      .default('https://services.ecourts.gov.in'),

    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_SENDER_ID: z.string().default('EVDTIS'),
    MSG91_WHATSAPP_INTEGRATED_NUMBER: z.string().optional(),
    MSG91_BASE_URL: z.string().url().default('https://control.msg91.com/api'),
    OTP_EXPIRY_MINUTES: z.coerce.number().default(10),

    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_SERVICE_NAME: z.string().default('evidentis-india-api'),

    EMBEDDING_MODEL: z.string().default('BAAI/bge-m3'),
    EMBEDDING_DIM: z.coerce.number().default(1024),
    INDIC_TRANS_MODEL: z.string().default('ai4bharat/indictrans2-en-indic-1B'),

    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    TRUST_PROXY: z.enum(['true', 'false']).default('false'),

    RATE_LIMIT_AUTH_REQUESTS: z.coerce.number().default(10),
    RATE_LIMIT_AUTH_WINDOW_MINUTES: z.coerce.number().default(15),
    RATE_LIMIT_OTP_REQUESTS: z.coerce.number().default(6),
    RATE_LIMIT_OTP_WINDOW_MINUTES: z.coerce.number().default(15),
    RATE_LIMIT_UPLOAD_REQUESTS: z.coerce.number().default(20),
    RATE_LIMIT_UPLOAD_WINDOW_MINUTES: z.coerce.number().default(60),
    RATE_LIMIT_RESEARCH_REQUESTS: z.coerce.number().default(120),
    RATE_LIMIT_RESEARCH_WINDOW_MINUTES: z.coerce.number().default(60),
    RATE_LIMIT_GENERAL_REQUESTS: z.coerce.number().default(1000),
    RATE_LIMIT_GENERAL_WINDOW_MINUTES: z.coerce.number().default(60),

    MAX_FILE_SIZE_BYTES: z.coerce.number().default(50 * 1024 * 1024),
    MAX_BATCH_SIZE_BYTES: z.coerce.number().default(200 * 1024 * 1024),

    PASSWORD_MIN_LENGTH: z.coerce.number().default(12),
    PASSWORD_REQUIRE_UPPERCASE: z.enum(['true', 'false']).default('true'),
    PASSWORD_REQUIRE_LOWERCASE: z.enum(['true', 'false']).default('true'),
    PASSWORD_REQUIRE_NUMBER: z.enum(['true', 'false']).default('true'),
    PASSWORD_REQUIRE_SPECIAL: z.enum(['true', 'false']).default('true'),

    MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().default(5),
    LOCKOUT_DURATION_MINUTES: z.coerce.number().default(15),

    DATA_PROTECTION_OFFICER_EMAIL: z
      .string()
      .email()
      .default('dpo@evidentis.tech'),
    DPDP_CONSENT_VERSION: z.string().default('1.0'),
    DATA_RESIDENCY_REGION: z
      .enum(['centralindia', 'ap-mumbai-1'])
      .default('centralindia'),
    DEFAULT_LANGUAGE: z.string().default('hi'),
    DEFAULT_CURRENCY: z.string().default('INR'),
    DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
    GST_RATE: z.coerce.number().default(18),
    FIRM_GSTIN: z.string().optional(),

    WEBAUTHN_RP_NAME: z.string().default('EvidentIS India'),
    WEBAUTHN_RP_ID: z.string().default('localhost'),
    WEBAUTHN_ORIGIN: z.string().default('http://localhost:3000'),
    EXPOSE_OTP_PREVIEW: z
      .enum(['true', 'false'])
      .default('false'),
  })
  .refine(
    (data) => {
      if (
        data.FIRM_GSTIN &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
          data.FIRM_GSTIN,
        )
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Invalid GSTIN format',
      path: ['FIRM_GSTIN'],
    },
  );

function loadConfig() {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    for (const error of result.error.errors) {
      console.error(`  - ${error.path.join('.')}: ${error.message}`);
    }
    process.exit(1);
  }

  const parsedConfig = result.data;
  let encryptionKey = parsedConfig.APP_ENCRYPTION_KEY?.trim();

  if (!encryptionKey && parsedConfig.APP_ENCRYPTION_KEY_FILE) {
    try {
      encryptionKey = fs
        .readFileSync(parsedConfig.APP_ENCRYPTION_KEY_FILE, 'utf8')
        .trim();
    } catch (error) {
      console.error(
        `Failed to read APP_ENCRYPTION_KEY_FILE (${parsedConfig.APP_ENCRYPTION_KEY_FILE}):`,
        error,
      );
      process.exit(1);
    }
  }

  if (!encryptionKey) {
    if (isProductionEnv) {
      console.error(
        'APP_ENCRYPTION_KEY is required in production (or set APP_ENCRYPTION_KEY_FILE).',
      );
      process.exit(1);
    }
    encryptionKey = DEV_APP_ENCRYPTION_KEY;
  }

  if (!/^[A-Fa-f0-9]{64}$/.test(encryptionKey)) {
    console.error(
      'APP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).',
    );
    process.exit(1);
  }

  if (isProductionEnv && parsedConfig.DB_SSL !== 'true') {
    console.error('DB_SSL must be set to true in production.');
    process.exit(1);
  }

  return {
    ...parsedConfig,
    APP_ENCRYPTION_KEY: encryptionKey,
  };
}

export const config = loadConfig();

export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';

export const corsOrigins = [
  ...config.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  'http://127.0.0.1:3000',
  'http://localhost:3000',
];
export const trustProxy = config.TRUST_PROXY === 'true';

export const passwordPolicy = {
  minLength: config.PASSWORD_MIN_LENGTH,
  requireUppercase: config.PASSWORD_REQUIRE_UPPERCASE === 'true',
  requireLowercase: config.PASSWORD_REQUIRE_LOWERCASE === 'true',
  requireNumber: config.PASSWORD_REQUIRE_NUMBER === 'true',
  requireSpecial: config.PASSWORD_REQUIRE_SPECIAL === 'true',
};

export const rateLimits = {
  auth: {
    requests: config.RATE_LIMIT_AUTH_REQUESTS,
    windowMs: config.RATE_LIMIT_AUTH_WINDOW_MINUTES * 60 * 1000,
  },
  otp: {
    requests: config.RATE_LIMIT_OTP_REQUESTS,
    windowMs: config.RATE_LIMIT_OTP_WINDOW_MINUTES * 60 * 1000,
  },
  upload: {
    requests: config.RATE_LIMIT_UPLOAD_REQUESTS,
    windowMs: config.RATE_LIMIT_UPLOAD_WINDOW_MINUTES * 60 * 1000,
  },
  research: {
    requests: config.RATE_LIMIT_RESEARCH_REQUESTS,
    windowMs: config.RATE_LIMIT_RESEARCH_WINDOW_MINUTES * 60 * 1000,
  },
  general: {
    requests: config.RATE_LIMIT_GENERAL_REQUESTS,
    windowMs: config.RATE_LIMIT_GENERAL_WINDOW_MINUTES * 60 * 1000,
  },
};
