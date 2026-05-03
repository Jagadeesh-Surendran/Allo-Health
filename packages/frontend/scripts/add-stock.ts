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
const INCREMENT_BY = 10

async function main() {
  const stockLevels = await prisma.stockLevel.findMany({
    include: {
      product: { select: { sku: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [{ productId: 'asc' }, { warehouseId: 'asc' }],
  })

  if (stockLevels.length === 0) {
    console.log('No stock levels found. Nothing to update.')
    return
  }

  for (const level of stockLevels) {
    await prisma.stockLevel.update({
      where: { id: level.id },
      data: { total: { increment: INCREMENT_BY } },
    })
  }

  const updated = await prisma.stockLevel.findMany({
    include: {
      product: { select: { sku: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [{ productId: 'asc' }, { warehouseId: 'asc' }],
  })

  console.log(`Added ${INCREMENT_BY} units to each stock level.`)
  for (const level of updated) {
    const available = level.total - level.reserved
    console.log(
      `${level.product.sku} @ ${level.warehouse.name}: total=${level.total}, reserved=${level.reserved}, available=${available}`,
    )
  }
}

main()
  .catch(async (error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
