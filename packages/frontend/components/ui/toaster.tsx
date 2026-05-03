'use client'

import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-2xl border border-border bg-white p-4 shadow-lg shadow-slate-900/10 ring-1 ring-black/5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={toast.variant === 'destructive' ? 'destructive' : 'secondary'}>
                  {toast.variant === 'destructive' ? 'Error' : 'Notice'}
                </Badge>
                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              </div>
              {toast.description ? (
                <p className="text-sm leading-5 text-slate-600">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}