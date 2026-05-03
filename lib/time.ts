import { env } from '@/lib/env'

export function reservationExpiresAt(): Date {
  const now = new Date()
  now.setSeconds(now.getSeconds() + env.RESERVATION_TTL_SECONDS)
  return now
}

export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}