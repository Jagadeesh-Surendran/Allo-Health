import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { AppError, toAppError } from '@/lib/errors'
import { ApiErrorSchema } from '@/lib/schemas'

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const payload = ApiErrorSchema.parse({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request',
    })

    return NextResponse.json(payload, { status: 400 })
  }

  const appError = toAppError(error)
  const payload = ApiErrorSchema.parse({
    error: appError.code,
    message: appError.message,
    ...(typeof appError.meta?.available === 'number'
      ? { available: appError.meta.available }
      : {}),
  })

  return NextResponse.json(payload, { status: appError.statusCode })
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}