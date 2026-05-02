import { Redis } from '@upstash/redis'

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('UPSTASH_REDIS_REST_URL is not set')
}
if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_TOKEN is not set')
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export const redisKeys = {
  lock: (productId: string, warehouseId: string) =>
    `lock:stock:${productId}:${warehouseId}` as const,

  idempotency: (key: string, endpoint: string) =>
    `idem:${endpoint}:${key}` as const,
} as const
