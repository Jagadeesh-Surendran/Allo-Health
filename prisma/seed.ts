import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const mumbai = await prisma.warehouse.upsert({
    where:  { id: 'wh_mumbai' },
    update: {},
    create: { id: 'wh_mumbai', name: 'Mumbai Central', location: 'Andheri East, Mumbai' },
  })

  const delhi = await prisma.warehouse.upsert({
    where:  { id: 'wh_delhi' },
    update: {},
    create: { id: 'wh_delhi', name: 'Delhi North', location: 'Rohini, Delhi' },
  })

  const products = [
    {
      id: 'prod_vitd',
      sku: 'VITD-5000',
      name: 'Vitamin D 5000IU',
      description: 'High-potency Vitamin D3 for immune support and bone health.',
      stock: { [mumbai.id]: 5, [delhi.id]: 2 },
    },
    {
      id: 'prod_omega',
      sku: 'OMEGA-3-1000',
      name: 'Omega-3 Fish Oil 1000mg',
      description: 'Ultra-pure omega-3 fatty acids, molecularly distilled.',
      stock: { [mumbai.id]: 3, [delhi.id]: 0 },
    },
    {
      id: 'prod_mag',
      sku: 'MAG-GLYC-400',
      name: 'Magnesium Glycinate 400mg',
      description: 'Highly bioavailable magnesium for sleep and muscle recovery.',
      stock: { [mumbai.id]: 1, [delhi.id]: 4 },
    },
  ]

  for (const p of products) {
    const product = await prisma.product.upsert({
      where:  { id: p.id },
      update: {},
      create: { id: p.id, sku: p.sku, name: p.name, description: p.description },
    })

    for (const [warehouseId, total] of Object.entries(p.stock)) {
      await prisma.stockLevel.upsert({
        where:  { productId_warehouseId: { productId: product.id, warehouseId } },
        update: {},
        create: { productId: product.id, warehouseId, total, reserved: 0 },
      })
    }
  }

  console.log('✅ Seed complete')
  console.log(`   Warehouses: ${[mumbai.name, delhi.name].join(', ')}`)
  console.log(`   Products:   ${products.map(p => p.sku).join(', ')}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
