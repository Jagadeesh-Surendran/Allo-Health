import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

export const redisKeys = {
  lock: (productId: string, warehouseId: string) =>
    `lock:stock:${productId}:${warehouseId}` as const,

  idempotency: (key: string, endpoint: string) =>
    `idem:${endpoint}:${key}` as const,
} as const
