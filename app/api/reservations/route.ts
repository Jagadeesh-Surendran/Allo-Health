import { NextRequest } from 'next/server'

import { created, getIdempotencyKey, handleError } from '@/lib/api-response'
import { withRetry } from '@/lib/db-utils'
import { reserveUnits } from '@/lib/reservation'
import { CreateReservationSchema } from '@/lib/schemas'
import { serializeReservation } from '@/lib/serializers'

export async function POST(request: NextRequest) {
  try {
    const idempotencyKey = getIdempotencyKey(request)
    const body = CreateReservationSchema.parse(await request.json())
    const reservation = await withRetry(() => reserveUnits(body, idempotencyKey))

    return created(serializeReservation(reservation))
  } catch (error) {
    return handleError(error)
  }
}