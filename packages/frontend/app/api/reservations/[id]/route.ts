import { NextRequest } from 'next/server'

import { handleError, ok } from '@/lib/api-response'
import { getReservation } from '@/lib/reservation'
import { CuidSchema } from '@/lib/schemas'
import { serializeReservation } from '@/lib/serializers'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params
    const id = CuidSchema.parse(rawId)
    const reservation = await getReservation(id)
    return ok(serializeReservation(reservation))
  } catch (error) {
    return handleError(error)
  }
}