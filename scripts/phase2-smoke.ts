import { existsSync, readFileSync } from 'node:fs'
import type { PrismaClient } from '@prisma/client'

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

let prismaClient: PrismaClient | undefined

async function readStock(productId: string, warehouseId: string) {
  prismaClient ??= (await import('../lib/prisma')).prisma
  return await prismaClient.stockLevel.findUnique({
    where: {
      productId_warehouseId: {
        productId,
        warehouseId,
      },
    },
  })
}

async function main() {
  prismaClient ??= (await import('../lib/prisma')).prisma
  const {
    confirmReservation,
    getReservation,
    releaseReservation,
    reserveUnits,
  } = await import('../lib/reservation')

  const mumbai = 'wh_mumbai'
  const delhi = 'wh_delhi'

  console.log('Phase 2 smoke test starting')

  const reserveTarget = await readStock('prod_mag', mumbai)
  if (!reserveTarget) throw new Error('Missing seed stock for prod_mag / wh_mumbai')

  const reservedReservation = await reserveUnits(
    { productId: 'prod_mag', warehouseId: mumbai, quantity: 1 },
    crypto.randomUUID(),
  )

  const afterReserve = await readStock('prod_mag', mumbai)
  console.log('reserveUnits:', reservedReservation.id, afterReserve)

  const confirmedReservation = await confirmReservation(
    reservedReservation.id,
    crypto.randomUUID(),
  )

  const afterConfirm = await readStock('prod_mag', mumbai)
  console.log('confirmReservation:', confirmedReservation.id, afterConfirm)

  const releaseReservationRecord = await reserveUnits(
    { productId: 'prod_vitd', warehouseId: mumbai, quantity: 1 },
    crypto.randomUUID(),
  )

  const afterReleaseReserve = await readStock('prod_vitd', mumbai)
  console.log('release target reserved:', releaseReservationRecord.id, afterReleaseReserve)

  const releasedReservation = await releaseReservation(releaseReservationRecord.id)
  const afterRelease = await readStock('prod_vitd', mumbai)
  console.log('releaseReservation:', releasedReservation.id, afterRelease)

  const expiredTarget = await reserveUnits(
    { productId: 'prod_vitd', warehouseId: delhi, quantity: 1 },
    crypto.randomUUID(),
  )

  await prismaClient!.reservation.update({
    where: { id: expiredTarget.id },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  })

  const expiredReservation = await getReservation(expiredTarget.id)
  const afterExpire = await readStock('prod_vitd', delhi)
  console.log('getReservation expired path:', expiredReservation.id, afterExpire)

  console.log('Phase 2 smoke test complete')
}

main()
  .catch((error) => {
    console.error('Phase 2 smoke test failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prismaClient?.$disconnect()
  })