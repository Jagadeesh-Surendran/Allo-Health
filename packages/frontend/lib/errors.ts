export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InsufficientStockError extends AppError {
  constructor(available: number) {
    super(409, 'INSUFFICIENT_STOCK', `Not enough stock. Available: ${available}`, { available })
    this.name = 'InsufficientStockError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ReservationExpiredError extends AppError {
  constructor(reservationId: string) {
    super(410, 'RESERVATION_EXPIRED', `Reservation ${reservationId} has expired`, { reservationId })
    this.name = 'ReservationExpiredError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ReservationNotFoundError extends AppError {
  constructor(reservationId: string) {
    super(404, 'RESERVATION_NOT_FOUND', `Reservation ${reservationId} not found`, { reservationId })
    this.name = 'ReservationNotFoundError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(409, 'INVALID_STATUS_TRANSITION', `Cannot transition from ${from} to ${to}`, { from, to })
    this.name = 'InvalidStatusTransitionError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ResourceLockedError extends AppError {
  constructor(resource: string) {
    super(423, 'RESOURCE_LOCKED', `Resource is locked: ${resource}. Retry in a moment.`, { resource })
    this.name = 'ResourceLockedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class StockInvariantViolationError extends AppError {
  constructor(detail: string) {
    super(500, 'STOCK_INVARIANT_VIOLATION', `Stock invariant violated: ${detail}`, { detail })
    this.name = 'StockInvariantViolationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof Error) {
    return new AppError(500, 'INTERNAL_ERROR', err.message)
  }
  return new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
}
