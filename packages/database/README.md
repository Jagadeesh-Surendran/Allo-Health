# Database Package

Prisma ORM configuration and PostgreSQL schema for Allo Inventory.

## Quick Start

```bash
# Create a new migration after schema changes
pnpm db:migrate:dev

# Deploy migrations to production
pnpm db:migrate:deploy

# Seed the database with test data
pnpm db:seed
```

## Project Structure

```
prisma/
├── schema.prisma      # Database schema definition
├── migrations/        # Versioned schema migrations
│   ├── migration_lock.toml
│   ├── 20260502000000_init/
│   └── 20260502000001_manual_check_constraints/
└── seed.ts           # Development data seeding

package.json          # Database-specific scripts
tsconfig.json         # TypeScript configuration
tsconfig.seed.json    # Config for seed script
```

## Database Schema

### Tables

#### `Product`
```
id              String  @id
sku             String  @unique
name            String
description     String?
imageUrl        String?
active          Boolean
createdAt       DateTime
updatedAt       DateTime

stockLevels     StockLevel[]
reservations    Reservation[]
```

#### `Warehouse`
```
id              String  @id
name            String
location        String
active          Boolean
createdAt       DateTime

stockLevels     StockLevel[]
```

#### `StockLevel`
```
id              String  @id
productId       String
warehouseId     String
total           Int    @default(0)
reserved        Int    @default(0)
updatedAt       DateTime

// Constraints:
// - total >= 0
// - reserved >= 0
// - reserved <= total
```

#### `Reservation`
```
id              String  @id
productId       String
warehouseId     String
quantity        Int
status          ReservationStatus  // PENDING, CONFIRMED, RELEASED, EXPIRED
idempotencyKey  String? @unique
expiresAt       DateTime
confirmedAt     DateTime?
releasedAt      DateTime?
createdAt       DateTime
updatedAt       DateTime

events          ReservationEvent[]
```

#### `ReservationEvent`
```
id              String  @id
reservationId   String
type            EventType          // RESERVED, CONFIRMED, RELEASED, EXPIRED
reason          String?
createdAt       DateTime

reservation     Reservation @relation(fields: [reservationId])
```

#### `IdempotencyRecord`
```
key             String  @id
value           String  @db.JsonB
expiresAt       DateTime
createdAt       DateTime
```

### Enums

```prisma
enum ReservationStatus {
  PENDING
  CONFIRMED
  RELEASED
  EXPIRED
}

enum EventType {
  RESERVED
  CONFIRMED
  RELEASED
  EXPIRED
}
```

## Database Constraints

### Check Constraints

Enforced at the PostgreSQL level:

```sql
-- StockLevel
ALTER TABLE "StockLevel"
  ADD CONSTRAINT stock_total_non_negative CHECK ("total" >= 0),
  ADD CONSTRAINT stock_reserved_non_negative CHECK ("reserved" >= 0),
  ADD CONSTRAINT stock_reserved_not_exceeds_total CHECK ("reserved" <= "total");

-- Reservation
ALTER TABLE "Reservation"
  ADD CONSTRAINT reservation_quantity_positive CHECK ("quantity" > 0);
```

These prevent invalid data from being inserted, even if application code is buggy.

## Migrations

### How to Create a Migration

After modifying `schema.prisma`:

```bash
pnpm db:migrate:dev
```

This will:
1. Detect schema changes
2. Generate a migration file with SQL
3. Ask for a migration name
4. Apply it to your local database
5. Update `schema.prisma` (if needed)

### Viewing Migrations

```
prisma/migrations/
├── 20260502000000_init/
│   └── migration.sql  # Initial schema
└── 20260502000001_manual_check_constraints/
    └── migration.sql  # Added check constraints
```

Each migration is idempotent and versioned.

### Applying Migrations to Production

```bash
pnpm db:migrate:deploy
```

This applies any pending migrations to the production database.

## Seeding

### Seed Script (`prisma/seed.ts`)

Populates development database with:
- 3 Products (Magnesium Glycinate, Omega-3, Vitamin D)
- 2 Warehouses (Mumbai Central, Delhi North)
- 6 StockLevels with realistic stock amounts

### Running the Seed

```bash
pnpm db:seed
```

Or via pnpm (from root):

```bash
pnpm db:seed
```

### Seed Data

**Products:**
- MAG-GLYC-400 (Magnesium Glycinate)
- OMEGA-3-1000 (Omega-3 Fish Oil)
- VITD-5000 (Vitamin D 5000IU)

**Warehouses:**
- Mumbai Central (Andheri East, Mumbai)
- Delhi North (Rohini, Delhi)

**Stock Levels:**
- Different quantities per warehouse to test reserve logic

## Using Prisma Client

### Importing in Frontend

```typescript
import { prisma } from '@allo-inventory/database'

const products = await prisma.product.findMany({
  include: { stockLevels: true }
})
```

### Importing in Backend

```typescript
import { prisma } from '@allo-inventory/database'

app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany()
  res.json(products)
})
```

### Type Safety

```typescript
import type { Product, StockLevel } from '@prisma/client'

const product: Product = await prisma.product.findUniqueOrThrow({
  where: { id: 'prod_vitd' }
})
```

## Environment Variables

Required in `.env.local` (monorepo root):

```env
DATABASE_URL=postgresql://[user:password@]host[:port]/database?schema=public
DIRECT_URL=postgresql://[user:password@]host[:port]/database?schema=public
```

**Notes:**
- `DATABASE_URL` — Connection pooler (Supabase pooler for serverless)
- `DIRECT_URL` — Direct PostgreSQL connection (for Prisma migrations)
- See [Supabase docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler) for pooler setup

## Prisma Commands

```bash
pnpm prisma generate              # Generate Prisma client (auto on install)
pnpm prisma migrate dev           # Create & apply migration locally
pnpm prisma migrate deploy        # Apply migrations to production DB
pnpm prisma db seed               # Run seed script
pnpm prisma db push               # Quick prototyping (not for production)
pnpm prisma studio                # Open GUI for database
```

## Database Transactions

The backend uses **Serializable** isolation level for critical operations:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const stockLevel = await tx.stockLevel.findUnique(
    { where: { ... } },
    { select: { reserved: true } }
  )
  // Optimistic lock check
  if (stockLevel.reserved + quantity > available) {
    throw new InsufficientStockError()
  }
  // Update
  return await tx.stockLevel.update({ ... })
}, {
  isolationLevel: 'Serializable',
  timeout: 4500, // 4.5 seconds
})
```

Benefits:
- Prevents dirty reads, non-repeatable reads, and phantom reads
- Ensures only one reservation succeeds per unit
- Checked row locks with FOR UPDATE for efficiency

## Backups and Disaster Recovery

On Supabase:
- Automated daily backups (7-day retention on free tier)
- Point-in-time restore available
- Manual backups via Supabase console

For production:
```bash
# Export database
pg_dump -h host -U user dbname > backup.sql

# Restore from backup
psql -h host -U user dbname < backup.sql
```

## Performance Optimization

### Indexes

Automatically created for:
- Primary keys (id)
- Foreign keys (productId, warehouseId)
- Unique constraints (sku, idempotencyKey)

Consider adding if needed:
```prisma
@@index([productId, warehouseId])
@@index([status])
@@index([expiresAt])
```

### Connection Pooling

Supabase provides:
- Pooler at `*.pooler.supabase.com` (recommended for serverless)
- Direct connection for migrations

## Troubleshooting

### "Timed out fetching a new connection from the connection pool"

**Cause:** Connection limit exceeded (Supabase free tier has 1 connection limit)

**Solution:**
- Reduce concurrent database queries
- Use connection pooling (Supabase pooler)
- Migrate to paid tier for more connections

### "Column 'xyz' does not exist"

**Cause:** Schema mismatch (new migration not applied)

**Solution:**
```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

### "Unique constraint failed"

**Cause:** Duplicate value in unique column (e.g., same idempotencyKey)

**Solution:**
- For idempotency, this is expected—catch the error and replay the response
- For SKU, this indicates duplicate data

## Future Enhancements

- [ ] Add read replicas for scaling reads
- [ ] Add full-text search on product name/description
- [ ] Add audit log table for compliance
- [ ] Add materialized views for analytics
- [ ] Add row-level security (RLS) for multi-tenant support
- [ ] Add partition by date for large tables
- [ ] Implement soft deletes with @db.DateTime fields

## License

Private — Allo Inventory Team
