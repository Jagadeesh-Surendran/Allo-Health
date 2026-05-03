import type { Prisma } from '@prisma/client'
import type { ProductDTO, ReservationDTO } from '@/lib/schemas'

type ProductWithStock = Prisma.ProductGetPayload<{
  include: { stockLevels: { include: { warehouse: true } } }
}>

export function serializeProduct(p: ProductWithStock) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    stockLevels: p.stockLevels
      .filter((stockLevel) => stockLevel.warehouse.active)
      .map((stockLevel) => ({
        warehouseId: stockLevel.warehouseId,
        warehouse: {
          id: stockLevel.warehouse.id,
          name: stockLevel.warehouse.name,
          location: stockLevel.warehouse.location,
          active: stockLevel.warehouse.active,
        },
        total: stockLevel.total,
        reserved: stockLevel.reserved,
        available: Math.max(0, stockLevel.total - stockLevel.reserved),
      })),
  } satisfies ProductDTO
}

type ReservationWithEvents = Prisma.ReservationGetPayload<{
  include: { events: true }
}>

function toIsoString(value: Date | string): string {
  return new Date(value).toISOString()
}

function toNullableIsoString(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return toIsoString(value)
}

export function serializeReservation(r: ReservationWithEvents) {
  return {
    id: r.id,
    productId: r.productId,
    warehouseId: r.warehouseId,
    quantity: r.quantity,
    status: r.status,
    expiresAt: toIsoString(r.expiresAt),
    confirmedAt: toNullableIsoString(r.confirmedAt),
    releasedAt: toNullableIsoString(r.releasedAt),
    createdAt: toIsoString(r.createdAt),
    events: r.events.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      createdAt: toIsoString(event.createdAt),
    })),
  } satisfies ReservationDTO
}