import { PrismaClient } from '@prisma/client'
import { existsSync, readFileSync } from 'node:fs'

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return

  const contents = readFileSync(filePath, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    if (!key || process.env[key] !== undefined) continue

    let value = trimmed.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const prisma = new PrismaClient()

// Resets Magnesium/Mumbai to exactly 1 unit for the stress test.
// Call this before each test run.
async function main() {
  await prisma.stockLevel.updateMany({
    where: { product: { sku: 'MAG-GLYC-400' }, warehouse: { name: 'Mumbai Central' } },
    data: { total: 1, reserved: 0 },
  })

  const product = await prisma.product.findUnique({ where: { sku: 'MAG-GLYC-400' } })
  if (!product) {
    throw new Error('MAG-GLYC-400 not found')
  }

  // Release any PENDING reservations that might be holding the stock.
  await prisma.reservation.updateMany({
    where: { productId: product.id, status: 'PENDING' },
    data: { status: 'RELEASED' },
  })

  console.log('Stock reset: MAG-GLYC-400 / Mumbai = 1 unit, 0 reserved')
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
