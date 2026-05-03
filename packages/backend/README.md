# Backend Package

Express.js REST API server for Allo Inventory (scaffolding in place, API routes to be migrated from Next.js).

## Quick Start

```bash
# From root monorepo
pnpm dev:backend

# Or directly in this package
cd packages/backend
pnpm dev
```

Runs on http://localhost:4000 by default.

## Project Structure

```
src/
├── index.ts          # Express server entry point
├── routes/          # API route handlers (to be added)
├── middleware/      # Express middleware (to be added)
├── types/           # TypeScript type definitions (to be added)
└── utils/           # Helper utilities (to be added)
└── tsconfig.json
```

## Current Status

**Phase 1 (Current):** Scaffolding only
- [x] Express server structure
- [x] TypeScript configuration
- [x] Health check endpoint (`GET /health`)
- [ ] API route handlers
- [ ] Middleware (auth, error handling, logging)
- [ ] Database connection
- [ ] Shared types import

## API Routes (to be migrated from frontend)

Once implemented, this backend will handle:

```
GET  /api/products               # List all products
GET  /api/warehouses             # List active warehouses
POST /api/reservations           # Create a reservation
GET  /api/reservations/:id       # Get reservation details
POST /api/reservations/:id/confirm
POST /api/reservations/:id/release
POST /api/cron/expire-reservations
POST /api/cron/cleanup-idempotency
```

## Dependencies

### Runtime
- `express` — Web framework
- `@prisma/client` — Database ORM
- `@upstash/redis` — Distributed locking
- `zod` — Input validation

### Development
- `@types/express` — Type definitions
- `@types/node` — Node.js types
- `tsx` — TypeScript runner
- `typescript` — Language

## Environment Variables

Will need (once routes are added):

```env
DATABASE_URL=postgresql://...           # Supabase pooler URL
DIRECT_URL=postgresql://...             # Supabase direct connection
UPSTASH_REDIS_REST_URL=https://...      # Upstash Redis
UPSTASH_REDIS_REST_TOKEN=...            # Upstash token
CRON_SECRET=...                         # Cron authentication
RESERVATION_TTL_SECONDS=600             # Reservation timeout
PORT=4000                               # Server port
NODE_ENV=development                    # Environment
```

## Scripts

```bash
pnpm dev           # Start dev server with live reload
pnpm build         # Compile TypeScript to dist/
pnpm start         # Run compiled dist/index.js
pnpm typecheck     # Type check without emitting
```

## Architecture Notes

### Shared Database Access
The backend will import Prisma from the database package:

```typescript
import { prisma } from '@allo-inventory/database'
import type { Reservation } from '@allo-inventory/database'
```

### Shared Validation
Input validation via Zod schemas from database package:

```typescript
import { CreateReservationSchema } from '@allo-inventory/database'

app.post('/api/reservations', (req, res) => {
  const parsed = CreateReservationSchema.parse(req.body)
  // ...
})
```

### Error Handling
Consistent error response format:

```typescript
{
  error: "ERROR_CODE",
  message: "User-friendly message",
  status: 400 | 409 | 410 | 423 | 500
}
```

## Migration Plan

**Step 1:** Move business logic files from frontend
- Copy `lib/reservation.ts` → `src/services/reservation.ts`
- Copy `lib/errors.ts` → `src/errors.ts`
- Copy `lib/db-utils.ts` → `src/utils/db.ts`

**Step 2:** Extract route handlers
- Copy `app/api/products/route.ts` → `src/routes/products.ts`
- Copy `app/api/reservations/route.ts` → `src/routes/reservations.ts`
- etc.

**Step 3:** Implement Express middleware
- Error handling middleware
- Validation middleware
- Authentication middleware (for cron)
- Request logging

**Step 4:** Update frontend API client
- Point to `http://localhost:4000` in development
- Point to backend URL in production

**Step 5:** Test end-to-end
- Run frontend + backend + database
- Verify all endpoints work
- Run stress test against separate servers

## Testing

### Health Check
```bash
curl http://localhost:4000/health
# {"status":"ok","timestamp":"2026-05-03T..."}
```

### API Test (once implemented)
```bash
curl -X GET http://localhost:4000/api/products
```

## Performance Considerations

- Connection pooling via Prisma (`connection_limit=1` on free tier)
- Distributed locking with Redis for high concurrency
- Serializable PostgreSQL transactions for correctness
- Indexed queries on productId, warehouseId

## Deployment

Once fully implemented, deploy to:
- **Staging:** Railway or Render for testing
- **Production:** Render, Railway, or Heroku with:
  - Auto-scaling for traffic spikes
  - Graceful shutdown handling
  - Health check endpoint for load balancer
  - Environment variable management
  - Database connection retry logic

## Future Enhancements

- [ ] Complete API route implementation
- [ ] Add request logging (pino or winston)
- [ ] Add API rate limiting
- [ ] Add request validation middleware
- [ ] Add CORS configuration
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add CI/CD pipeline
- [ ] Add container deployment (Docker)
- [ ] Add monitoring and alerting
- [ ] Add graceful shutdown handling

## License

Private — Allo Inventory Team
