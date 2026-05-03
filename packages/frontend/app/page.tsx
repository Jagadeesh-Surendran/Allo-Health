import { prisma } from '@/lib/prisma'
import { serializeProduct } from '@/lib/serializers'
import type { ProductDTO, StockLevelDTO } from '@/lib/schemas'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ReserveButton } from '@/components/reserve-button'
import { RefreshStockButton } from '@/components/refresh-stock-button'
import { SkuCopyButton } from '@/components/sku-copy-button'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return <Badge variant="destructive">Out of stock</Badge>
  }

  if (available === 1) {
    return (
      <Badge variant="destructive" className="opacity-90">
        Only 1 left
      </Badge>
    )
  }

  if (available <= 3) {
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-700">
        Only {available} left
      </Badge>
    )
  }

  return <Badge variant="secondary">{available} available</Badge>
}

export default async function Home() {
  const rawProducts = await prisma.product.findMany({
    include: { stockLevels: { include: { warehouse: true } } },
    orderBy: { name: 'asc' },
  })

  const products: ProductDTO[] = rawProducts.map(serializeProduct)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div>
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
        <div className="shrink-0">
          <RefreshStockButton />
        </div>
      </div>

      <div className="grid gap-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No products are configured yet.
            </CardContent>
          </Card>
        ) : (
          products.map((product: ProductDTO) => (
            <Card key={product.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{product.name}</CardTitle>
                {product.description ? (
                  <p className="text-sm text-slate-500">{product.description}</p>
                ) : null}
              </CardHeader>
              <CardContent>
                <SkuCopyButton sku={product.sku} />
                <Separator className="my-3" />
                <div className="space-y-2">
                  {product.stockLevels.length === 0 ? (
                    <p className="text-sm text-slate-500">No active warehouse stock for this product.</p>
                  ) : (
                    product.stockLevels.map((stockLevel: StockLevelDTO) => (
                      <div
                        key={stockLevel.warehouseId}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="truncate font-medium">{stockLevel.warehouse.name}</span>
                          <span className="hidden truncate text-xs text-slate-400 sm:block">
                            {stockLevel.warehouse.location}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StockBadge available={stockLevel.available} />
                          <ReserveButton
                            productId={product.id}
                            warehouseId={stockLevel.warehouseId}
                            available={stockLevel.available}
                            warehouseName={stockLevel.warehouse.name}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
