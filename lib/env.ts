import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL:              z.string().url(),
  DIRECT_URL:                z.string().url(),
  UPSTASH_REDIS_REST_URL:    z.string().url(),
  UPSTASH_REDIS_REST_TOKEN:  z.string().min(1),
  CRON_SECRET:               z.string().min(32),
  NEXT_PUBLIC_APP_URL:       z.string().url().optional(),
  RESERVATION_TTL_SECONDS:   z.coerce.number().int().positive().default(600),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:\n',
    parsed.error.flatten().fieldErrors,
  )
  throw new Error('Invalid environment variables. Check server logs.')
}

export const env = parsed.data
