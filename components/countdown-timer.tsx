'use client'

import { useCallback, useEffect, useState } from 'react'

interface Props {
  expiresAt: string
  onExpired?: () => void
}

export function CountdownTimer({ expiresAt, onExpired }: Props) {
  const getRemaining = useCallback(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  }, [expiresAt])

  const [remaining, setRemaining] = useState(getRemaining)
  const [fired, setFired] = useState(false)

  useEffect(() => {
    setRemaining(getRemaining())
    setFired(false)
  }, [getRemaining])

  useEffect(() => {
    const interval = setInterval(() => {
      const nextRemaining = getRemaining()
      setRemaining(nextRemaining)

      if (nextRemaining === 0 && !fired) {
        setFired(true)
        onExpired?.()
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [fired, getRemaining, onExpired])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  if (remaining === 0) {
    return <span className="font-mono text-sm font-semibold text-red-600">Expired</span>
  }

  const isUrgent = remaining <= 60

  return (
    <span
      className={`font-mono text-sm font-semibold tabular-nums ${
        isUrgent ? 'text-red-600 animate-pulse' : 'text-amber-600'
      }`}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}