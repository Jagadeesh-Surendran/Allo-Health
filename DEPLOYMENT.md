# Allo Inventory - Vercel Deployment Guide

## Overview

This document describes the Vercel production deployment configuration for the Allo Inventory management application. The frontend is deployed on Vercel with automated cron jobs for scheduled maintenance tasks.

**Live Production URL**: https://frontend-ten-tan-4wfoa0siei.vercel.app

---

## Tech Stack

### Core Technologies
- **Framework**: Next.js 15.5.15 (frontend)
- **Database ORM**: Prisma 5.22.0
- **Database**: Supabase PostgreSQL with connection pooling
- **Cache**: Upstash Redis REST API
- **Deployment**: Vercel (Hobby Plan)
- **Package Manager**: pnpm
- **Language**: TypeScript

### Key Libraries
- `@prisma/client@5.22.0` - Database ORM client
- `@upstash/redis@1.37.0` - Redis client for distributed locks and caching
- `zod@4.4.2` - Runtime environment variable validation
- `next@15.5.15` - React framework

---

## Project Structure

```
allo-inventory/
├── packages/
│   └── frontend/                    # Vercel deployment target
│       ├── app/                     # Next.js app directory
│       │   ├── api/                 # API routes
│       │   │   ├── cron/            # Scheduled jobs
│       │   │   ├── reservations/    # Reservation endpoints
│       │   │   └── health/          # Health check
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── lib/
│       │   ├── env.ts               # Environment variable validation (Zod)
│       │   ├── prisma.ts            # Prisma client singleton
│       │   ├── redis.ts             # Redis client configuration
│       │   ├── lock.ts              # Distributed lock implementation
│       │   ├── reservation.ts       # Reservation business logic
│       │   ├── db-utils.ts          # Database utilities
│       │   └── schemas.ts           # Zod schemas
│       ├── prisma/
│       │   └── schema.prisma        # CRITICAL: Local copy for Vercel build
│       ├── components/
│       │   └── ui/                  # Shadcn UI components
│       ├── package.json             # Frontend dependencies and scripts
│       └── .vercelignore            # Files to exclude from deployment
├── vercel.json                      # Vercel configuration & cron schedules
├── prisma/                          # Database package (not deployed)
│   ├── schema.prisma                # Source of truth for schema
│   ├── migrations/                  # Database migrations
│   └── seed.ts                      # Database seeding script
└── scripts/
    └── phase2-smoke.ts              # Smoke test script
```

---

## Deployment Configuration

### 1. Environment Variables

All environment variables must be configured in Vercel project settings. The following are required:

#### Required Variables (Production)
```env
# Database
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://user:pass@host:5432/db

# Redis Cache
UPSTASH_REDIS_REST_URL=https://picked-cheetah-112261.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAbaFAAIg...

# Cron Jobs
CRON_SECRET=a7f3k9mX2pQr8nVw5tYjLb6cUhDe1sZo

# Optional
NEXT_PUBLIC_APP_URL=https://frontend-ten-tan-4wfoa0siei.vercel.app
RESERVATION_TTL_SECONDS=600  # Default: 10 minutes
```

#### Variable Setup
To add environment variables to Vercel:

```bash
# From packages/frontend directory
cd packages/frontend
pnpm dlx vercel link --project frontend
pnpm dlx vercel env add DATABASE_URL production --yes
pnpm dlx vercel env add DIRECT_URL production --yes
pnpm dlx vercel env add UPSTASH_REDIS_REST_URL production --yes
pnpm dlx vercel env add UPSTASH_REDIS_REST_TOKEN production --yes
pnpm dlx vercel env add CRON_SECRET production --yes
pnpm dlx vercel env add NEXT_PUBLIC_APP_URL production --yes
```

**Important**: Use `production` environment, not preview. These are validated by Zod during build.

---

### 2. Prisma Configuration

#### Why a Local Schema Copy?
The `packages/frontend/prisma/schema.prisma` is a **critical requirement** for Vercel deployment.

**Problem**: Vercel only uploads files within the deployment package directory (`packages/frontend`). The original schema at `prisma/schema.prisma` is outside this directory and inaccessible during build.

**Solution**: Copy the schema to `packages/frontend/prisma/schema.prisma` for build-time type generation.

#### Schema Sync Workflow
When updating database schema:

```bash
# 1. Update the source schema
nano prisma/schema.prisma

# 2. Create and run migration
pnpm --filter database migrate dev --name <migration_name>

# 3. IMPORTANT: Copy updated schema to frontend
cp prisma/schema.prisma packages/frontend/prisma/schema.prisma

# 4. Regenerate Prisma Client locally
pnpm --filter frontend prisma generate

# 5. Commit and push
git add -A
git commit -m "schema: update [description]"
git push
```

#### Build-Time Generation
The postinstall script in `packages/frontend/package.json` handles Prisma generation:

```json
{
  "scripts": {
    "postinstall": "prisma generate --schema=prisma/schema.prisma"
  }
}
```

This runs automatically during `npm install` in Vercel's build environment, generating types before Next.js compilation.

---

### 3. Cron Job Configuration

Cron jobs are defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-reservations",
      "schedule": "0 0 * * *"  // Daily at 00:00 UTC
    },
    {
      "path": "/api/cron/cleanup-idempotency",
      "schedule": "0 1 * * *"  // Daily at 01:00 UTC
    }
  ]
}
```

#### Hobby Plan Restrictions
⚠️ **Vercel Hobby Plan**: Only allows **daily** cron jobs (once per day minimum).

Invalid schedules that will be rejected:
- `* * * * *` (every minute) ❌
- `0 * * * *` (hourly) ❌
- `0 */6 * * *` (every 6 hours) ❌

#### Cron Security
All cron routes must verify the `CRON_SECRET`:

```typescript
// app/api/cron/expire-reservations/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... process job
}
```

#### Monitoring Cron Jobs
View execution logs in Vercel dashboard:
1. Go to: https://vercel.com/jagadeesh-ss-projects/frontend
2. Navigate to: Settings → Cron Jobs
3. View execution history and logs

---

## Deployment Process

### Initial Deployment
```bash
# 1. Navigate to workspace root
cd C:/Users/jaag1/Pictures/inventery\ management/allo-inventory

# 2. Ensure all files are committed
git status

# 3. Deploy to Vercel (production)
pnpm dlx vercel --prod --cwd packages/frontend --yes
```

### Redeployment (After Schema Changes)
```bash
# 1. Update source schema and migrate
pnpm --filter database migrate dev

# 2. Copy schema to frontend
cp prisma/schema.prisma packages/frontend/prisma/schema.prisma

# 3. Test locally
cd packages/frontend
pnpm build

# 4. Commit changes
cd ../..
git add -A
git commit -m "schema: update [description]"
git push

# 5. Redeploy (auto-triggered by Vercel GitHub integration OR manual)
pnpm dlx vercel --prod --cwd packages/frontend --yes
```

---

## Environment Variable Validation

All environment variables are validated at build time using Zod schema in `lib/env.ts`:

```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  RESERVATION_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
```

#### Build Failure - Invalid Environment Variables
If the build fails with:
```
Invalid environment variables:
{
  DATABASE_URL: ['Invalid input'],
  DIRECT_URL: ['Invalid input'],
  ...
}
```

**Troubleshooting**:
1. ✅ Verify all variables exist in Vercel project settings (production environment)
2. ✅ Check for special characters that need escaping (e.g., `&` in URLs)
3. ✅ Ensure URLs are valid and resolvable
4. ✅ Confirm `CRON_SECRET` is at least 32 characters
5. ✅ Review Vercel build logs for additional context

---

## API Endpoints

### Reservations
- **POST** `/api/reservations` - Create a new reservation
- **GET** `/api/reservations/[id]` - Get reservation details
- **POST** `/api/reservations/[id]/confirm` - Confirm a reservation
- **POST** `/api/reservations/[id]/release` - Release a reservation

### Cron Jobs
- **GET** `/api/cron/expire-reservations` - Expire pending reservations (scheduled)
- **GET** `/api/cron/cleanup-idempotency` - Clean up idempotency records (scheduled)

### Health Check
- **GET** `/api/health` - Health check endpoint

---

## Testing & Verification

### 1. Verify Deployment
```bash
# Check if frontend is accessible
$response = Invoke-WebRequest -Uri "https://frontend-ten-tan-4wfoa0siei.vercel.app"
Write-Host "Status: $($response.StatusCode)"  # Should be 200
```

### 2. Browser Test
Open: https://frontend-ten-tan-4wfoa0siei.vercel.app

Expected: Allo Inventory page loads with product list and stock levels

### 3. API Test
```bash
curl -X POST https://frontend-ten-tan-4wfoa0siei.vercel.app/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod-1","warehouseId":"wh-1","quantity":1}'
```

### 4. Run Local Smoke Test
```bash
cd packages/frontend
pnpm dlx ts-node ../../scripts/phase2-smoke.ts
```

---

## Troubleshooting

### Build Fails: "prisma generate" Error
**Error**: `Could not load --schema from provided path ../database/prisma/schema.prisma`

**Solution**: 
- Ensure `packages/frontend/prisma/schema.prisma` exists
- Schema path in `postinstall` must be relative to `packages/frontend`
- Correct path: `prisma/schema.prisma` (not `../database/prisma/schema.prisma`)

### Build Fails: Prisma Client Not Generated
**Error**: `Module '@prisma/client' has no exported member 'ReservationStatus'`

**Solution**:
- Add `postinstall` script to `package.json`
- Add `prisma` as devDependency
- Run `pnpm install` locally to verify

### Build Fails: Environment Variable Validation
**Error**: `Invalid environment variables: {DATABASE_URL: ['Invalid input'], ...}`

**Solution**:
- Confirm all 6 required variables are set in Vercel project (production env)
- Check variable values don't contain unescaped special characters
- Verify URLs are valid: use `z.string().url()` format
- Check Vercel build logs for detailed validation errors

### Cron Job Not Running
**Error**: Job doesn't execute at scheduled time

**Solution**:
1. Verify `CRON_SECRET` is set correctly (must match header validation)
2. Check Vercel dashboard Cron Jobs tab for execution history
3. Ensure route returns 2xx status code (Vercel requires success response)
4. Review server logs in deployment inspector

### Database Connection Issues
**Error**: `Error connecting to database`

**Solution**:
- Verify `DATABASE_URL` points to correct pooler connection
- Use `DIRECT_URL` for direct connections (migrations)
- Confirm Supabase database is running and accepting connections
- Check firewall/network access from Vercel IP ranges

---

## GitHub Integration

All code is version-controlled in GitHub: https://github.com/Jagadeesh-Surendran/Allo-Health

Vercel automatically deploys on:
- Push to `master` branch
- Pull requests (preview deployments)

### Deployment Commit
Latest deployment commit:
- **Hash**: `e45d6df`
- **Message**: "deploy: configure Vercel deployment with Prisma schema and environment setup"
- **Changes**:
  - ✅ Added Prisma schema to frontend package
  - ✅ Configured postinstall script
  - ✅ Updated vercel.json with cron schedules
  - ✅ Added Vercel project config

---

## Performance Notes

### Build Time
- Typical build: ~2-3 minutes
- Prisma generation: ~128ms
- Next.js compilation: ~8-9s
- Dependency installation: ~50s

### Runtime Performance
- First request latency: ~100-200ms (cold start on Hobby plan)
- Subsequent requests: <50ms (warm)
- Redis cache: ~10-50ms for operations
- Database queries: <100ms with pooler optimization

### Cost Optimization
- Vercel Hobby Plan: Free tier with limitations
- Cron jobs: 2 daily executions (max for Hobby)
- Function timeout: 300 seconds
- Cold start: Acceptable for this workload

---

## Maintenance & Updates

### Regular Tasks
1. **Weekly**: Monitor Vercel deployment logs
2. **Monthly**: Review cron job execution history
3. **As needed**: Apply database migrations and schema updates

### Schema Update Process
```bash
# Always follow this workflow for schema changes:
1. Update source schema: prisma/schema.prisma
2. Create migration: pnpm --filter database migrate dev --name <name>
3. Copy to frontend: cp prisma/schema.prisma packages/frontend/prisma/schema.prisma
4. Regenerate types: pnpm --filter frontend prisma generate
5. Test locally: pnpm --filter frontend build
6. Commit & push: git add -A && git commit -m "schema: ..." && git push
7. Vercel redeploys automatically (or manual: vercel --prod)
```

### Dependency Updates
```bash
# Check for updates
pnpm outdated

# Update specific package
pnpm --filter frontend update @prisma/client@latest

# Test build
pnpm --filter frontend build

# Deploy
pnpm dlx vercel --prod --cwd packages/frontend --yes
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Upstash Redis**: https://upstash.com/docs/redis/overview
- **Supabase Docs**: https://supabase.com/docs

---

## Deployment Checklist

Before production deployment, ensure:

- [ ] All environment variables configured in Vercel (production)
- [ ] Prisma schema copied to `packages/frontend/prisma/schema.prisma`
- [ ] Postinstall script in `package.json` configured
- [ ] All database migrations applied
- [ ] Local build passes: `pnpm --filter frontend build`
- [ ] Cron jobs configured in `vercel.json`
- [ ] Code committed to GitHub
- [ ] No uncommitted changes in workspace

---

**Last Updated**: May 3, 2026  
**Deployment Status**: ✅ Live on Vercel  
**Production URL**: https://frontend-ten-tan-4wfoa0siei.vercel.app
