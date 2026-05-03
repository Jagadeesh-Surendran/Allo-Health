import { Prisma, ReservationStatus } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

import {
  InsufficientStockError,
  InvalidStatusTransitionError,
  ReservationExpiredError,
  ReservationNotFoundError,
  StockInvariantViolationError,
} from '@/lib/errors'
import { withStockLock } from '@/lib/lock'
import { prisma } from '@/lib/prisma'
import { redis, redisKeys } from '@/lib/redis'
import { reservationExpiresAt } from '@/lib/time'
import type { CreateReservationInput } from '@/lib/schemas'

export type ReservationWithEvents = Prisma.ReservationGetPayload<{
  include: { events: true }
}>

function toReservationWithEvents(reservation: ReservationWithEvents): ReservationWithEvents {
  return reservation
}

async function getReservationById(reservationId: string): Promise<ReservationWithEvents | null> {
  return await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  })
}

function reservationCacheKey(action: 'reserve' | 'confirm', idempotencyKey: string, reservationId?: string): string {
  if (action === 'reserve') {
    return redisKeys.idempotency(idempotencyKey, 'reserve')
  }

  return redisKeys.idempotency(idempotencyKey, `confirm:${reservationId ?? ''}`)
}

function parseCachedReservation(cached: unknown): ReservationWithEvents {
  if (typeof cached === 'string') {
    return JSON.parse(cached) as ReservationWithEvents
  }

  return cached as ReservationWithEvents
}

function reservationRecordKey(action: 'reserve' | 'confirm', idempotencyKey: string, reservationId?: string): string {
  if (action === 'reserve') {
    return `reserve:${idempotencyKey}`
  }

  return `confirm:${reservationId ?? ''}:${idempotencyKey}`
}

async function persistIdempotencyRecord(
  action: 'reserve' | 'confirm',
  idempotencyKey: string,
  reservation: ReservationWithEvents,
  reservationId?: string,
): Promise<void> {
  await prisma.idempotencyRecord.upsert({
    where: { key: reservationRecordKey(action, idempotencyKey, reservationId) },
    create: {
      key: reservationRecordKey(action, idempotencyKey, reservationId),
      endpoint: action,
      statusCode: action === 'reserve' ? 201 : 200,
      responseBody: JSON.stringify(reservation),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    update: {
      endpoint: action,
      statusCode: action === 'reserve' ? 201 : 200,
      responseBody: JSON.stringify(reservation),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })
}

export async function reserveUnits(
  input: CreateReservationInput,
  idempotencyKey?: string,
): Promise<ReservationWithEvents> {
  const { productId, warehouseId, quantity } = input

  if (idempotencyKey) {
    const cacheKey = reservationCacheKey('reserve', idempotencyKey)
    const cached = await redis.get<unknown>(cacheKey)

    if (cached) {
      return parseCachedReservation(cached)
    }
  }

  const reservation = await withStockLock(productId, warehouseId, async () => {
    try {
      return await prisma.$transaction(
        async (tx) => {
        const rows = await tx.$queryRaw<Array<{
          id: string
          total: number
          reserved: number
        }>>`
          SELECT id, total, reserved
          FROM "StockLevel"
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `

        const stockLevel = rows[0]

        if (!stockLevel) {
          throw new InsufficientStockError(0)
        }

        if (stockLevel.reserved > stockLevel.total) {
          throw new StockInvariantViolationError(
            `reserved(${stockLevel.reserved}) > total(${stockLevel.total}) for product=${productId} warehouse=${warehouseId}`,
          )
        }

        const available = stockLevel.total - stockLevel.reserved

        if (available < quantity) {
          throw new InsufficientStockError(available)
        }

        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { reserved: { increment: quantity } },
        })

        return await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: ReservationStatus.PENDING,
            expiresAt: reservationExpiresAt(),
            ...(idempotencyKey ? { idempotencyKey } : {}),
            events: {
              create: {
                toStatus: ReservationStatus.PENDING,
                reason: 'reservation_created',
              },
            },
          },
          include: { events: true },
        })
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 4500,
          maxWait: 2000,
        },
      )
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002' && idempotencyKey) {
        const existing = await prisma.reservation.findUnique({
          where: { idempotencyKey },
          include: { events: true },
        })

        if (existing) {
          return existing
        }
      }

      throw error
    }
  })

  if (idempotencyKey) {
    const cacheKey = reservationCacheKey('reserve', idempotencyKey)
    await redis.set(cacheKey, JSON.stringify(reservation), { ex: 86400 })
    await persistIdempotencyRecord('reserve', idempotencyKey, reservation)
  }

  return reservation
}

export async function confirmReservation(
  reservationId: string,
  idempotencyKey?: string,
): Promise<ReservationWithEvents> {
  if (idempotencyKey) {
    const cacheKey = reservationCacheKey('confirm', idempotencyKey, reservationId)
    const cached = await redis.get<unknown>(cacheKey)

    if (cached) {
      return parseCachedReservation(cached)
    }
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string
        status: ReservationStatus
        expiresAt: Date
        productId: string
        warehouseId: string
        quantity: number
      }>>`
        SELECT id, status, "expiresAt", "productId", "warehouseId", quantity
        FROM "Reservation"
        WHERE id = ${reservationId}
        FOR UPDATE
      `

      const reservation = rows[0]

      if (!reservation) {
        throw new ReservationNotFoundError(reservationId)
      }

      if (reservation.status === ReservationStatus.CONFIRMED) {
        const existing = await tx.reservation.findUniqueOrThrow({
          where: { id: reservationId },
          include: { events: { orderBy: { createdAt: 'asc' } } },
        })

        return existing
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new InvalidStatusTransitionError(reservation.status, 'CONFIRMED')
      }

      const expiryCheck = await tx.$queryRaw<Array<{ expired: boolean }>>`
        SELECT "expiresAt" < NOW() AS expired
        FROM "Reservation"
        WHERE id = ${reservationId}
      `

      const expired = expiryCheck[0]?.expired ?? true

      if (expired) {
        await tx.stockLevel.updateMany({
          where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
          data: { reserved: { decrement: reservation.quantity } },
        })

        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.EXPIRED },
        })

        await tx.reservationEvent.create({
          data: {
            reservationId,
            fromStatus: ReservationStatus.PENDING,
            toStatus: ReservationStatus.EXPIRED,
            reason: 'expired_on_confirm_attempt',
          },
        })

        throw new ReservationExpiredError(reservationId)
      }

      await tx.stockLevel.updateMany({
        where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
        data: {
          total: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      })

      return await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
          confirmedAt: new Date(),
          events: {
            create: {
              fromStatus: ReservationStatus.PENDING,
              toStatus: ReservationStatus.CONFIRMED,
              reason: 'payment_confirmed',
            },
          },
        },
        include: { events: true },
      })
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 4500,
      maxWait: 2000,
    },
  )

  if (idempotencyKey) {
    const cacheKey = reservationCacheKey('confirm', idempotencyKey, reservationId)
    await redis.set(cacheKey, JSON.stringify(result), { ex: 86400 })
    await persistIdempotencyRecord('confirm', idempotencyKey, result, reservationId)
  }

  return result
}

export async function releaseReservation(reservationId: string): Promise<ReservationWithEvents> {
  return await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string
        status: ReservationStatus
        productId: string
        warehouseId: string
        quantity: number
      }>>`
        SELECT id, status, "productId", "warehouseId", quantity
        FROM "Reservation"
        WHERE id = ${reservationId}
        FOR UPDATE
      `

      const reservation = rows[0]

      if (!reservation) {
        throw new ReservationNotFoundError(reservationId)
      }

      if (reservation.status === ReservationStatus.RELEASED || reservation.status === ReservationStatus.EXPIRED) {
        return await tx.reservation.findUniqueOrThrow({
          where: { id: reservationId },
          include: { events: { orderBy: { createdAt: 'asc' } } },
        })
      }

      if (reservation.status === ReservationStatus.CONFIRMED) {
        throw new InvalidStatusTransitionError('CONFIRMED', 'RELEASED')
      }

      const stockRows = await tx.$queryRaw<Array<{ reserved: number }>>`
        SELECT reserved
        FROM "StockLevel"
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
        FOR UPDATE
      `

      const currentReserved = stockRows[0]?.reserved ?? 0
      const safeDecrement = Math.min(reservation.quantity, currentReserved)

      if (safeDecrement < reservation.quantity) {
        console.warn(
          `[reservation] Partial release for ${reservationId}: requested=${reservation.quantity}, available_to_release=${safeDecrement}`,
        )
      }

      await tx.stockLevel.updateMany({
        where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
        data: { reserved: { decrement: safeDecrement } },
      })

      return await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.RELEASED,
          releasedAt: new Date(),
          events: {
            create: {
              fromStatus: ReservationStatus.PENDING,
              toStatus: ReservationStatus.RELEASED,
              reason: 'user_cancelled',
            },
          },
        },
        include: { events: true },
      })
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 4500,
      maxWait: 2000,
    },
  )
}

export async function expireStaleReservations(): Promise<number> {
  const stale = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Reservation"
    WHERE status = 'PENDING' AND "expiresAt" < NOW()
    ORDER BY "expiresAt" ASC
    LIMIT 100
  `

  let expiredCount = 0

  for (const { id } of stale) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const rows = await tx.$queryRaw<Array<{
            status: ReservationStatus
            productId: string
            warehouseId: string
            quantity: number
          }>>`
            SELECT status, "productId", "warehouseId", quantity
            FROM "Reservation"
            WHERE id = ${id}
            FOR UPDATE
          `

          const reservation = rows[0]

          if (!reservation || reservation.status !== ReservationStatus.PENDING) {
            return
          }

          await tx.stockLevel.updateMany({
            where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
            data: { reserved: { decrement: reservation.quantity } },
          })

          await tx.reservation.update({
            where: { id },
            data: { status: ReservationStatus.EXPIRED },
          })

          await tx.reservationEvent.create({
            data: {
              reservationId: id,
              fromStatus: ReservationStatus.PENDING,
              toStatus: ReservationStatus.EXPIRED,
              reason: 'expired_by_cron',
            },
          })
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 3000,
          maxWait: 1000,
        },
      )

      expiredCount += 1
    } catch (error) {
      console.error(`[expiry] Failed to expire reservation ${id}:`, error)
    }
  }

  return expiredCount
}

export async function getReservation(reservationId: string): Promise<ReservationWithEvents> {
  const reservation = await getReservationById(reservationId)

  if (!reservation) {
    throw new ReservationNotFoundError(reservationId)
  }

  if (reservation.status === ReservationStatus.PENDING) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const rows = await tx.$queryRaw<Array<{ expired: boolean }>>`
            SELECT "expiresAt" < NOW() AS expired
            FROM "Reservation"
            WHERE id = ${reservationId}
            FOR UPDATE
          `

          if (!rows[0]?.expired) {
            return
          }

          await tx.stockLevel.updateMany({
            where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
            data: { reserved: { decrement: reservation.quantity } },
          })

          await tx.reservation.update({
            where: { id: reservationId },
            data: { status: ReservationStatus.EXPIRED },
          })

          await tx.reservationEvent.create({
            data: {
              reservationId,
              fromStatus: ReservationStatus.PENDING,
              toStatus: ReservationStatus.EXPIRED,
              reason: 'expired_lazy',
            },
          })
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 3000,
          maxWait: 1000,
        },
      )
    } catch (error) {
      console.error(`[lazy-expiry] Failed for ${reservationId}:`, error)
    }

    return await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    })
  }

  return toReservationWithEvents(reservation)
}