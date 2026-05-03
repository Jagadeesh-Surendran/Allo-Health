import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { AppError, toAppError } from '@/lib/errors'

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Invalid request body', issues: err.flatten() },
      { status: 400 },
    )
  }

  const appError = toAppError(err)

  if (appError.statusCode >= 500 && process.env.NODE_ENV === 'production') {
    console.error('[api-error]', appError)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      error: appError.code,
      message: appError.message,
      ...(appError.meta ?? {}),
    },
    { status: appError.statusCode },
  )
}

export function getIdempotencyKey(req: Request): string | undefined {
  const key = req.headers.get('idempotency-key')
  if (!key) return undefined

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(key)) {
    throw new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be a valid UUID v4')
  }

  return key
}