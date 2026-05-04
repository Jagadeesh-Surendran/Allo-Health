import { redis } from '../infrastructure/cache/redis.client'

export class IdempotencyService {
  async get(key: string) {
    return redis.get(key)
  }

  async set(key: string, value: string, ttl = 86400) {
    return redis.setex(key, ttl, value)
  }
}

export default new IdempotencyService()
