import { z } from 'zod'
import { ReservationStatus } from '@prisma/client'

export const CuidSchema = z.string().min(1)

export const IdempotencyKeySchema = z
  .string()
  .uuid()
  .optional()

export const CreateReservationSchema = z.object({
  productId:   CuidSchema,
  warehouseId: CuidSchema,
  quantity:    z.number().int().min(1).max(100),
})
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>

export const WarehouseSchema = z.object({
  id:       z.string(),
  name:     z.string(),
  location: z.string(),
  active:   z.boolean(),
})
export type WarehouseDTO = z.infer<typeof WarehouseSchema>

export const StockLevelSchema = z.object({
  warehouseId: z.string(),
  warehouse:   WarehouseSchema,
  total:       z.number().int().nonnegative(),
  reserved:    z.number().int().nonnegative(),
  available:   z.number().int().nonnegative(),
})
export type StockLevelDTO = z.infer<typeof StockLevelSchema>

export const ProductSchema = z.object({
  id:          z.string(),
  sku:         z.string(),
  name:        z.string(),
  description: z.string().nullable(),
  imageUrl:    z.string().url().nullable(),
  stockLevels: z.array(StockLevelSchema),
})
export type ProductDTO = z.infer<typeof ProductSchema>

export const ReservationEventSchema = z.object({
  id:         z.string(),
  fromStatus: z.nativeEnum(ReservationStatus).nullable(),
  toStatus:   z.nativeEnum(ReservationStatus),
  reason:     z.string().nullable(),
  createdAt:  z.string().datetime(),
})

export const ReservationSchema = z.object({
  id:            z.string(),
  productId:     z.string(),
  warehouseId:   z.string(),
  quantity:      z.number().int().positive(),
  status:        z.nativeEnum(ReservationStatus),
  expiresAt:     z.string().datetime(),
  confirmedAt:   z.string().datetime().nullable(),
  releasedAt:    z.string().datetime().nullable(),
  createdAt:     z.string().datetime(),
  events:        z.array(ReservationEventSchema).optional(),
})
export type ReservationDTO = z.infer<typeof ReservationSchema>

export const ApiErrorSchema = z.object({
  error:     z.string(),
  message:   z.string(),
  available: z.number().int().nonnegative().optional(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>
