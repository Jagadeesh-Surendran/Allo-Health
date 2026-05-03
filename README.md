# Allo Inventory — Monorepo

Real-time inventory reservation system with strict concurrency guarantees, now organized as a monorepo with separated **frontend**, **backend**, and **database** layers.

## 📁 Project Structure

```
allo-inventory-monorepo/
├── packages/
│   ├── frontend/           # Next.js React client application
│   ├── backend/            # Express.js REST API server (scaffolding)
│   └── database/           # Prisma ORM and database schemas
├── pnpm-workspace.yaml     # Monorepo workspace configuration
├── package.json            # Root monorepo scripts
└── README.md              # This file
```

## 🚀 Quick Start

### Install Dependencies
```bash
pnpm install
```

### Development

**Start frontend on http://localhost:3002:**
```bash
pnpm dev:frontend
```

**Start backend on http://localhost:4000 (when implemented):**
```bash
pnpm dev:backend
```

### Building

Build all packages:
```bash
pnpm build
```

Build a specific package:
```bash
pnpm --filter @allo-inventory/frontend build
```

### Type Checking

Check types across all packages:
```bash
pnpm typecheck
```

## 🗄️ Database Commands

**Create a new migration:**
```bash
pnpm db:migrate:dev
```

**Deploy migrations to production database:**
```bash
pnpm db:migrate:deploy
```

**Seed the database:**
```bash
pnpm db:seed
```

## 🧪 Testing & Tools

**Reset stock for stress testing:**
```bash
pnpm reset-stock
```

**Run concurrency stress test (50 concurrent reservations):**
```bash
pnpm stress-test
```

## 📦 Package Details

### Frontend (`packages/frontend`)

**Next.js 14** client-side application with:
- Product listing page with stock badges
- Checkout flow with countdown timer
- Real-time reserve/confirm/cancel UI
- SKU copy button
- Quantity selector (1-N units)
- Stock polling and refresh button
- Loading skeletons

**Features:**
- ✅ All UI components styled with Tailwind CSS
- ✅ Error handling with toast notifications
- ✅ Responsive design
- ✅ Idempotent reserve/confirm with unique keys

**Commands:**
```bash
pnpm --filter @allo-inventory/frontend dev
pnpm --filter @allo-inventory/frontend build
pnpm --filter @allo-inventory/frontend typecheck
```

### Backend (`packages/backend`)

**Express.js** REST API server (scaffolding in place).

**Design:**
- Will handle all `/api/*` routes
- Shared database access via Prisma
- Shared types and schemas via workspace dependencies
- Planned: Move API routes from Next.js to here

**Current Status:** Placeholder structure ready for API route migration.

**Commands:**
```bash
pnpm --filter @allo-inventory/backend dev
pnpm --filter @allo-inventory/backend build
```

### Database (`packages/database`)

**Prisma ORM** and PostgreSQL schema management.

**Includes:**
- `prisma/schema.prisma` — database schema with:
  - Product, Warehouse, StockLevel tables
  - Reservation and ReservationEvent for tracking
  - IdempotencyRecord for idempotent operations
- `prisma/migrations/` — versioned schema changes with check constraints
- Seed scripts for development data
- Shared types exported from Prisma client

**Commands:**
```bash
pnpm --filter @allo-inventory/database migrate:dev
pnpm --filter @allo-inventory/database seed
```

## 🔗 Workspace Dependencies

Packages can reference each other:

```json
{
  "dependencies": {
    "@allo-inventory/database": "workspace:*"
  }
}
```

Currently, all packages share:
- `@prisma/client` — for database access
- `zod` — for validation
- `@upstash/redis` — for distributed locks

## 📊 Architecture

### Current Implementation (Monorepo)

```
packages/frontend (Next.js)
├── /app              → Pages and layouts
├── /components       → React UI components
├── /api              → API routes (temporary)
├── /lib              → Business logic & DB access
└── next.config.mjs   → Next.js configuration

packages/backend (Express - scaffolding)
├── /src
│   └── index.ts      → Express server
└── tsconfig.json

packages/database (Prisma)
├── /prisma
│   ├── schema.prisma → Database schema
│   ├── migrations/   → Schema migrations
│   └── seed.ts       → Seed data
└── package.json
```

### Planned Architecture (Full Separation)

```
Frontend (Next.js)    Backend (Express)    Database (Prisma)
├── Pages             ├── GET /products    ├── Schema
├── Components        ├── POST /reserve    └── Migrations
└── API Client        ├── POST /confirm
                      └── POST /release
```

## 🔄 Migration Path

**Phase 1 ✅ Complete:** Monorepo structure set up
- [x] Frontend package created with full Next.js app
- [x] Backend package scaffolded with Express
- [x] Database package with Prisma in place
- [x] All dependencies installed and buildable
- [x] Frontend builds and runs on localhost:3002

**Phase 2 (Future):** Extract API routes from Next.js to Express
- Move `/api/*` route handlers to backend
- Update frontend to call backend server instead of Next.js routes
- Implement shared TypeScript definitions in database package

**Phase 3 (Future):** Deploy separately
- Deploy frontend to Vercel
- Deploy backend to Render/Railway/Heroku
- Database remains on Supabase PostgreSQL

## 🛠️ Development Notes

### Imports Across Packages

Frontend can import from database:
```typescript
import type { Reservation } from '@allo-inventory/database'
```

Backend can import from database:
```typescript
import { prisma } from '@allo-inventory/database'
```

### Environment Variables

Each package can have its own `.env.local`:
- `packages/frontend/.env.local` — DATABASE_URL, UPSTASH_REDIS_* (inherited from root)
- `packages/backend/.env.local` — Will need same database and Redis credentials

Currently, the frontend uses the root `.env.local` copied into the package.

### Running Scripts

Run a script in a specific package:
```bash
pnpm --filter @allo-inventory/frontend reset-stock
```

Run the same script in all packages:
```bash
pnpm -r typecheck    # runs typecheck in all packages that have it
```

### Adding Dependencies

Add to a specific package:
```bash
pnpm --filter @allo-inventory/frontend add axios
```

Add to root (shared):
```bash
pnpm add -w -D eslint
```

## ✅ Concurrency Stress Test Results

**Passing test** — 50 concurrent reservation attempts against 1 unit of stock:

```text
Results (4288ms total):
  ✅ 201 Created:      1   ← exactly 1 succeeded
  🔒 423 Locked:       49  ← Redis lock prevented others
  💥 5xx Errors:       0   ← no server errors
  
Post-test stock:
  available: 0  ← correct, all reserved
  reserved:  1  ← correct, one confirmed
```

**How it works:**
1. Redis distributed lock with SET NX + Lua release
2. Serializable PostgreSQL transactions with FOR UPDATE row locks
3. Unique constraint on (productId, warehouseId, idempotencyKey) for idempotency
4. Automatic expiry of stale reservations via Vercel Cron

## 📚 Additional Resources

- **Concurrency Model:** Distributed lock (Redis) + pessimistic row locking (PostgreSQL Serializable)
- **Idempotency:** Idempotency-Key header + Redis cache + unique constraint fallback
- **Auto-Expiry:** Vercel Cron every minute + lazy evaluation on reservation GET
- **Database Constraints:** Check constraints on stock invariants (total >= 0, reserved <= total, etc.)

## 📝 License

Private — Allo Inventory Team


Use these commands to prove the locking strategy under concurrent load:

```bash
pnpm reset-stock
pnpm stress-test
```

Passing local output:

```text
🧪 Allo Inventory — Concurrency Stress Test
	 Target: http://localhost:3000
	 Concurrent requests: 50
	 Expected: exactly 1 success (201), ~49 conflicts (409)

	 Product:   prod_mag
	 Warehouse: wh_mumbai

Results (4288ms total):
	✅ 201 Created:           1   ← must be exactly 1
	🚫 409 Conflict:          0
	🔒 423 Locked:            49
	💥 5xx Server errors:     0
	❌ Network failures:      0

Post-test stock (MAG-GLYC-400 / Mumbai):
	available: 0  ← must be 0
	reserved:  1   ← must be 1 (or 0 if confirmed)

--------------------------------------------------
✅ PASS: Race condition correctly prevented.
	 Exactly 1 of 50 concurrent requests succeeded.
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
