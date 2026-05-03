import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { expireStaleReservations } from '@/lib/reservation'

async function handleCron(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const expired = await expireStaleReservations()
    console.log(`[cron] Expired ${expired} reservations`)

    return NextResponse.json({ expired, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[cron-error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60