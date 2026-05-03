import type { ApiError, ProductDTO, ReservationDTO } from '@/lib/schemas'

const BASE = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  : ''

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; error: null } | { data: null; error: ApiError }> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const json = await res.json()

  if (!res.ok) {
    return { data: null, error: json as ApiError }
  }

  return { data: json as T, error: null }
}

export const apiClient = {
  getProducts: () => request<ProductDTO[]>('/api/products'),

  getReservation: (id: string) => request<ReservationDTO>(`/api/reservations/${id}`),

  createReservation: (
    body: { productId: string; warehouseId: string; quantity: number },
    idempotencyKey: string,
  ) => request<ReservationDTO>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Idempotency-Key': idempotencyKey },
  }),

  confirmReservation: (id: string, idempotencyKey: string) => request<ReservationDTO>(
    `/api/reservations/${id}/confirm`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
    },
  ),

  releaseReservation: (id: string) => request<ReservationDTO>(`/api/reservations/${id}/release`, {
    method: 'POST',
  }),
}