import { ResourceLockedError } from '@/lib/errors'
import { redis, redisKeys } from '@/lib/redis'

const LOCK_TTL_MS = 5000

export async function withStockLock<T>(
  productId: string,
  warehouseId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = redisKeys.lock(productId, warehouseId)
  const lockValue = crypto.randomUUID()

  let acquired = false

  try {
    const result = await redis.set(key, lockValue, {
      nx: true,
      px: LOCK_TTL_MS,
    })

    if (result === null) {
      throw new ResourceLockedError(`stock:${productId}:${warehouseId}`)
    }

    acquired = true
    return await fn()
  } catch (error) {
    if (!acquired) {
      if (error instanceof ResourceLockedError) {
        throw error
      }

      console.warn(
        `[lock] Redis unavailable for stock:${productId}:${warehouseId}; falling back to database lock`,
        error,
      )
      return await fn()
    }

    throw error
  } finally {
    if (acquired) {
      try {
        const releaseResult = await redis.eval(
          `if redis.call("get", KEYS[1]) == ARGV[1] then
             return redis.call("del", KEYS[1])
           else
             return 0
           end`,
          [key],
          [lockValue],
        )

        if (releaseResult === 0) {
          console.warn(`[lock] Redis lock expired before release for ${key}`)
        }
      } catch (error) {
        console.warn(`[lock] Failed to release Redis lock for ${key}`, error)
      }
    }
  }
}