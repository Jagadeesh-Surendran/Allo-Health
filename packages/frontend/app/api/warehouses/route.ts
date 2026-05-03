import { NextResponse } from 'next/server'

import { handleError } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(warehouses)
  } catch (err) {
    return handleError(err)
  }
}