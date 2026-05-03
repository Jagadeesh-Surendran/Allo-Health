import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

import { AppError } from '@/lib/errors'

export function isSerializationError(err: unknown): boolean {
  return err instanceof PrismaClientKnownRequestError && err.code === 'P2034'
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt += 1

      if (isSerializationError(error) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** (attempt - 1)))
        continue
      }

      if (isSerializationError(error)) {
        throw new AppError(409, 'SERIALIZATION_FAILURE', 'Transaction conflict. Please retry.')
      }

      throw error
    }
  }
}