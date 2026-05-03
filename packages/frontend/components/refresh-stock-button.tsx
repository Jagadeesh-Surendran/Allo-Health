'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  autoRefreshInterval?: number // milliseconds, 0 to disable
}

export function RefreshStockButton({ autoRefreshInterval = 0 }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async () => {
    setIsLoading(true)
    router.refresh()
    // Simulate a small delay to show loading state
    setTimeout(() => setIsLoading(false), 500)
  }

  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return

    const interval = setInterval(() => {
      router.refresh()
    }, autoRefreshInterval)

    return () => clearInterval(interval)
  }, [autoRefreshInterval, router])

  return (
    <Button
      onClick={handleRefresh}
      disabled={isLoading}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      {isLoading ? 'Refreshing…' : 'Refresh stock'}
    </Button>
  )
}
