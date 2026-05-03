'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CountdownTimer } from '@/components/countdown-timer'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api-client'
import type { ReservationDTO } from '@/lib/schemas'

interface Props {
  reservation: ReservationDTO
  productName: string
  warehouseName: string
  urlExpiresAt: string | undefined
}

const STATUS_BADGE: Record<string, React.ReactNode> = {
  PENDING: <Badge variant="outline" className="border-amber-400 text-amber-700">Pending</Badge>,
  CONFIRMED: <Badge variant="default" className="bg-green-600">Confirmed</Badge>,
  RELEASED: <Badge variant="secondary">Cancelled</Badge>,
  EXPIRED: <Badge variant="destructive">Expired</Badge>,
}

export function CheckoutClient({ reservation: initial, productName, warehouseName, urlExpiresAt }: Props) {
  const [reservation, setReservation] = useState<ReservationDTO>(initial)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [localExpired, setLocalExpired] = useState(initial.status === 'EXPIRED')
  const router = useRouter()
  const { toast } = useToast()

  const expiresAt = urlExpiresAt ?? reservation.expiresAt

  const handleTimerExpired = useCallback(() => {
    setLocalExpired(true)
    toast({
      variant: 'destructive',
      title: 'Reservation expired',
      description: 'Your hold has been released. The item is available again.',
    })
  }, [toast])

  const handleConfirm = async () => {
    setConfirming(true)

    const idempotencyKey = crypto.randomUUID()
    const { data, error } = await apiClient.confirmReservation(reservation.id, idempotencyKey)

    if (error) {
      setConfirming(false)

      if (error.error === 'RESERVATION_EXPIRED') {
        setLocalExpired(true)
        toast({
          variant: 'destructive',
          title: 'Reservation expired',
          description: 'Your hold timed out before payment was confirmed.',
        })
      } else {
        toast({ variant: 'destructive', title: 'Confirmation failed', description: error.message })
      }

      return
    }

    setReservation(data)
    setConfirming(false)
    toast({ title: 'Order confirmed', description: 'Your order has been placed.' })
  }

  const handleCancel = async () => {
    setCancelling(true)
    const { data, error } = await apiClient.releaseReservation(reservation.id)

    if (error) {
      setCancelling(false)
      toast({ variant: 'destructive', title: 'Cancel failed', description: error.message })
      return
    }

    setReservation(data)
    setCancelling(false)
    toast({ title: 'Reservation cancelled', description: 'Your hold has been released.' })
  }

  const canConfirm = reservation.status === 'PENDING' && !localExpired
  const canCancel = reservation.status === 'PENDING' && !localExpired
  const showActions = reservation.status === 'PENDING' || reservation.status === 'EXPIRED'

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to products
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{productName}</CardTitle>
            {STATUS_BADGE[reservation.status]}
          </div>
          <p className="text-sm text-slate-500">{warehouseName}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Separator />

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <span className="text-slate-500">Quantity</span>
            <span className="font-medium">{reservation.quantity}</span>

            <span className="text-slate-500">Reservation ID</span>
            <span className="truncate font-mono text-xs text-slate-400">{reservation.id}</span>

            {(reservation.status === 'PENDING' || reservation.status === 'EXPIRED') && (
              <>
                <span className="text-slate-500">Expires in</span>
                <CountdownTimer expiresAt={expiresAt} onExpired={handleTimerExpired} />
              </>
            )}

            {reservation.confirmedAt && (
              <>
                <span className="text-slate-500">Confirmed at</span>
                <span>{new Date(reservation.confirmedAt).toLocaleTimeString()}</span>
              </>
            )}
          </div>

          {showActions && (
            <>
              <Separator />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleConfirm} disabled={!canConfirm || confirming}>
                  {confirming ? 'Confirming…' : 'Confirm purchase'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={!canCancel || cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel'}
                </Button>
              </div>
              {localExpired && (
                <p className="text-center text-xs text-red-500">
                  This reservation has expired. Return to products to start over.
                </p>
              )}
            </>
          )}

          {reservation.status === 'CONFIRMED' && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-sm font-medium text-green-800">Order confirmed!</p>
              <p className="mt-1 text-xs text-green-600">Your order has been placed successfully.</p>
            </div>
          )}

          {reservation.status === 'RELEASED' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-sm font-medium text-slate-800">Reservation cancelled</p>
              <p className="mt-1 text-xs text-slate-500">Your hold has been released.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}