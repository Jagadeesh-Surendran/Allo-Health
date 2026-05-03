const fs = require('node:fs')
const { PrismaClient } = require('@prisma/client')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const contents = fs.readFileSync(filePath, 'utf8')
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

async function main() {
  const reservationId = process.argv[2]
  const idempotencyKey = process.argv[3]

  if (!reservationId || !idempotencyKey) {
    throw new Error('Usage: node scripts/expire-test-record.cjs <reservationId> <idempotencyKey>')
  }

  const past = new Date(Date.now() - 1000)

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { expiresAt: past },
  })

  await prisma.idempotencyRecord.updateMany({
    where: { key: { startsWith: `reserve:${idempotencyKey}` } },
    data: { expiresAt: past },
  })

  console.log(JSON.stringify({ reservationId, idempotencyKey, expiresAt: past.toISOString() }))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })