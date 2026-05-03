'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api-client'

interface Props {
  productId: string
  warehouseId: string
  available: number
  warehouseName: string
}

export function ReserveButton({ productId, warehouseId, available, warehouseName }: Props) {
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const router = useRouter()
  const { toast } = useToast()

  const handleReserve = async () => {
    if (quantity < 1 || quantity > available) {
      toast({
        variant: 'destructive',
        title: 'Invalid quantity',
        description: `Please select between 1 and ${available} units.`,
      })
      return
    }

    setLoading(true)

    const idempotencyKey = crypto.randomUUID()
    const { data, error } = await apiClient.createReservation(
      { productId, warehouseId, quantity },
      idempotencyKey,
    )

    if (error) {
      setLoading(false)

      if (error.error === 'INSUFFICIENT_STOCK') {
        toast({
          variant: 'destructive',
          title: 'Out of stock',
          description: `Only ${error.available ?? 0} unit(s) available at ${warehouseName}.`,
        })
      } else if (error.error === 'RESOURCE_LOCKED') {
        toast({
          variant: 'destructive',
          title: 'High demand',
          description: 'This item is being reserved by another customer. Try again in a moment.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Something went wrong',
          description: error.message,
        })
      }

      return
    }

    router.push(`/checkout/${data.id}?expiresAt=${encodeURIComponent(data.expiresAt)}`)
  }

  return (
    <div className="flex items-center gap-2">
      {available > 0 && (
        <input
          type="number"
          min="1"
          max={available}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(available, parseInt(e.target.value) || 1)))}
          disabled={loading}
          className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-center text-sm font-medium text-slate-900 disabled:opacity-50"
        />
      )}
      <Button
        onClick={handleReserve}
        disabled={loading || available === 0}
        size="sm"
        variant={available === 0 ? 'outline' : 'default'}
        className={available === 0 ? 'opacity-50 cursor-not-allowed' : ''}
      >
        {loading ? 'Reserving…' : available === 0 ? 'Out of stock' : 'Reserve'}
      </Button>
    </div>
  )
}