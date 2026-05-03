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
  const key = process.argv[2] ?? process.env.TEST_KEY
  if (!key) {
    throw new Error('TEST_KEY is required')
  }

  const reservationCount = await prisma.reservation.count({
    where: { idempotencyKey: key },
  })

  const idempotencyRecordCount = await prisma.idempotencyRecord.count({
    where: { key: { startsWith: `reserve:${key}` } },
  })

  console.log(JSON.stringify({ reservationCount, idempotencyRecordCount }))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })