import { NextRequest } from 'next/server'

import { getIdempotencyKey, handleError, ok } from '@/lib/api-response'
import { withRetry } from '@/lib/db-utils'
import { confirmReservation } from '@/lib/reservation'
import { CuidSchema } from '@/lib/schemas'
import { serializeReservation } from '@/lib/serializers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = CuidSchema.parse(params.id)
    const idempotencyKey = getIdempotencyKey(request)
    const reservation = await withRetry(() => confirmReservation(id, idempotencyKey))

    return ok(serializeReservation(reservation))
  } catch (error) {
    return handleError(error)
  }
}