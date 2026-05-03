import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Live inventory
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Products
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Reserve a product to hold it for 10 minutes while you complete checkout.
        </p>
      </div>

      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
            </CardHeader>
            <CardContent>
              <div className="mb-3 h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="mb-3 h-px bg-slate-200" />
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-20 animate-pulse rounded bg-slate-200" />
                      <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
