import { NextResponse } from 'next/server'

import { handleError } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { serializeProduct } from '@/lib/serializers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products.map(serializeProduct))
  } catch (err) {
    return handleError(err)
  }
}