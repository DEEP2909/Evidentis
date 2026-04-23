import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

const redisConfig = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redis = new Redis(config.REDIS_URL, redisConfig);

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
