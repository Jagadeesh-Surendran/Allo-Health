import { notFound } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { getReservation } from '@/lib/reservation'
import { serializeReservation } from '@/lib/serializers'

import { CheckoutClient } from './checkout-client'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ expiresAt?: string }>
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  let reservation
  const { id } = await params
  const { expiresAt } = await searchParams

  try {
    reservation = serializeReservation(await getReservation(id))
  } catch {
    notFound()
  }

  const product = await prisma.product.findUnique({ where: { id: reservation.productId } })
  const warehouse = await prisma.warehouse.findUnique({ where: { id: reservation.warehouseId } })

  return (
    <CheckoutClient
      reservation={reservation}
      productName={product?.name ?? 'Product'}
      warehouseName={warehouse?.name ?? 'Warehouse'}
      urlExpiresAt={expiresAt}
    />
  )
}