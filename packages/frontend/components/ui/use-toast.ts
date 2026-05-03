'use client'

import { useSyncExternalStore } from 'react'

export type ToastVariant = 'default' | 'destructive'

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export type Toast = ToastInput & {
  id: string
}

const listeners = new Set<() => void>()
let toasts: Toast[] = []

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function addToast(input: ToastInput): Toast {
  const toast = {
    id: crypto.randomUUID(),
    variant: 'default' as const,
    duration: 5000,
    ...input,
  }

  toasts = [toast, ...toasts].slice(0, 4)
  emit()

  globalThis.setTimeout(() => {
    dismiss(toast.id)
  }, toast.duration)

  return toast
}

function dismiss(id: string) {
  const nextToasts = toasts.filter((toast) => toast.id !== id)

  if (nextToasts.length === toasts.length) {
    return
  }

  toasts = nextToasts
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return toasts
}

function getServerSnapshot() {
  return [] as Toast[]
}

export function useToast() {
  const currentToasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    toasts: currentToasts,
    toast: addToast,
    dismiss,
  }
}