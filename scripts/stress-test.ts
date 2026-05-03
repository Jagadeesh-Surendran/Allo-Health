import { randomUUID } from 'node:crypto'

const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000'

// These must match actual seeded IDs. Fetch them from the API first.
async function getTestIds(): Promise<{ productId: string; warehouseId: string }> {
  const res = await fetch(`${BASE_URL}/api/products`)
  const products = (await res.json()) as Array<{
    id: string
    sku: string
    stockLevels: Array<{ warehouseId: string; warehouse: { name: string }; available: number }>
  }>

  const mag = products.find((product) => product.sku === 'MAG-GLYC-400')
  if (!mag) throw new Error('MAG-GLYC-400 not found - did you seed the database?')

  const mumbai = mag.stockLevels.find((stockLevel) => stockLevel.warehouse.name === 'Mumbai Central')
  if (!mumbai) throw new Error('Mumbai Central stock level not found')

  return { productId: mag.id, warehouseId: mumbai.warehouseId }
}

type Result = { status: number; body: unknown }

async function attemptReservation(productId: string, warehouseId: string): Promise<Result> {
  const res = await fetch(`${BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
  })

  return { status: res.status, body: await res.json() }
}

async function main() {
  const CONCURRENCY = 50
  console.log('\n🧪 Allo Inventory — Concurrency Stress Test')
  console.log(`   Target: ${BASE_URL}`)
  console.log(`   Concurrent requests: ${CONCURRENCY}`)
  console.log('   Expected: exactly 1 success (201), ~49 conflicts (409)\n')

  const { productId, warehouseId } = await getTestIds()
  console.log(`   Product:   ${productId}`)
  console.log(`   Warehouse: ${warehouseId}\n`)

  const start = Date.now()
  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENCY }, () => attemptReservation(productId, warehouseId)),
  )
  const elapsed = Date.now() - start

  const fulfilled = results.filter(
    (result): result is PromiseFulfilledResult<Result> => result.status === 'fulfilled',
  )
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  const successes = fulfilled.filter((result) => result.value.status === 201)
  const conflicts = fulfilled.filter((result) => result.value.status === 409)
  const locked = fulfilled.filter((result) => result.value.status === 423)
  const errors = fulfilled.filter((result) => result.value.status >= 500)

  console.log(`Results (${elapsed}ms total):`)
  console.log(`  ✅ 201 Created:           ${successes.length}   ← must be exactly 1`)
  console.log(`  🚫 409 Conflict:          ${conflicts.length}`)
  console.log(`  🔒 423 Locked:            ${locked.length}`)
  console.log(`  💥 5xx Server errors:     ${errors.length}`)
  console.log(`  ❌ Network failures:      ${rejected.length}`)

  const verifyRes = await fetch(`${BASE_URL}/api/products`)
  const products = (await verifyRes.json()) as Array<{
    sku: string
    stockLevels: Array<{ warehouse: { name: string }; available: number; reserved: number }>
  }>
  const mag = products.find((product) => product.sku === 'MAG-GLYC-400')!
  const mumbaiPost = mag.stockLevels.find((stockLevel) => stockLevel.warehouse.name === 'Mumbai Central')!

  console.log('\nPost-test stock (MAG-GLYC-400 / Mumbai):')
  console.log(`  available: ${mumbaiPost.available}  ← must be 0`)
  console.log(`  reserved:  ${mumbaiPost.reserved}   ← must be 1 (or 0 if confirmed)`)

  console.log('\n' + '─'.repeat(50))
  if (successes.length === 1 && errors.length === 0 && rejected.length === 0) {
    console.log('✅ PASS: Race condition correctly prevented.')
    console.log(`   Exactly 1 of ${CONCURRENCY} concurrent requests succeeded.`)
    process.exit(0)
  } else {
    if (successes.length !== 1) {
      console.error(`❌ FAIL: ${successes.length} requests succeeded. Expected exactly 1.`)
      console.error('   RACE CONDITION DETECTED. The locking strategy is broken.')
    }
    if (errors.length > 0) {
      console.error(`❌ FAIL: ${errors.length} server errors. Check logs.`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Test runner failed:', error)
  process.exit(1)
})
