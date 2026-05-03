# Frontend Package

Next.js 14 client-side application for Allo Inventory.

## Quick Start

```bash
# From root monorepo
pnpm dev:frontend

# Or directly in this package
cd packages/frontend
pnpm dev
```

Opens on http://localhost:3002 (or next available port).

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Product listing page
│   ├── layout.tsx         # Root layout with nav and toaster
│   ├── globals.css        # Tailwind CSS + custom styles
│   ├── api/               # API routes (temporary, to be moved to backend)
│   │   ├── products/
│   │   ├── reservations/
│   │   ├── warehouses/
│   │   └── cron/
│   ├── checkout/          # Reservation checkout flow
│   │   └── [id]/
│   └── fonts/
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── reserve-button.tsx # Reserve button with quantity selector
│   ├── countdown-timer.tsx # Live countdown to reservation expiry
│   ├── refresh-stock-button.tsx # Manual stock refresh
│   └── sku-copy-button.tsx # Copyable SKU display
├── lib/                  # Business logic and utilities
│   ├── api-client.ts     # Typed HTTP client for API calls
│   ├── api-response.ts   # Response helpers and error serialization
│   ├── serializers.ts    # DTO transformers
│   ├── schemas.ts        # Zod validation schemas
│   ├── prisma.ts         # Prisma client singleton
│   ├── redis.ts          # Upstash Redis client
│   ├── reservation.ts    # Core reservation business logic
│   ├── errors.ts         # Custom error classes
│   ├── db-utils.ts       # Database retry logic
│   ├── time.ts           # Time utilities (TTL, expiry)
│   ├── utils.ts          # General utilities (cn, etc.)
│   ├── env.ts            # Environment variable validation
│   ├── http.ts           # HTTP utilities
│   └── lock.ts           # Distributed lock utilities
├── scripts/              # Helper scripts
│   ├── reset-stock.ts    # Reset stock for testing
│   └── stress-test.ts    # Concurrency stress test
├── prisma/              # Database schema and migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/              # Static assets
├── next.config.mjs      # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
├── postcss.config.mjs   # PostCSS configuration
└── package.json         # Package dependencies
```

## Features

### Pages

#### Product Listing (`/`)
- Server-rendered with `force-dynamic` for real-time stock
- Shows all products with stock per warehouse
- Stock badges with color-coded states:
  - Red: Out of stock
  - Red (urgent): Only 1 left
  - Amber (warning): Only 2-3 left
  - Green: Available stock
- Reserve button with quantity selector
- SKU copy button
- Refresh stock button (manual)
- Loading skeleton on initial load

#### Checkout (`/checkout/:id`)
- Displays reservation details:
  - Product name
  - Warehouse location
  - Unit cost (placeholder)
- Live countdown timer (MM:SS format)
  - Turns red and pulses when < 60 seconds
  - Shows "Expired" when time runs out
- Confirm purchase button
- Cancel reservation button
- Updates without page refresh (client-side state)

### Components

#### `<ReserveButton>`
- Quantity input (1 to available max)
- Disabled when out of stock
- Shows loading state ("Reserving…")
- Handles errors:
  - INSUFFICIENT_STOCK → shows available count
  - RESOURCE_LOCKED → retry message
  - Other → generic error

#### `<CountdownTimer>`
- Renders MM:SS countdown
- Recomputes from expiresAt ISO string (never drifts)
- Handles edge cases:
  - Already expired on mount
  - System clock changes
  - Long page idle

#### `<RefreshStockButton>`
- Calls `router.refresh()` to re-fetch product data
- Shows loading state ("Refreshing…")
- Can be configured for auto-refresh intervals

#### `<SkuCopyButton>`
- Hover shows copy icon
- Click copies SKU to clipboard
- Shows check mark on success for 2 seconds

## API Integration

The frontend currently uses Next.js API routes (in `/app/api`), which will be moved to the separate backend package in Phase 2.

### API Client (`lib/api-client.ts`)

Typed fetch wrapper with error handling:

```typescript
const { data, error } = await apiClient.createReservation(
  { productId, warehouseId, quantity },
  idempotencyKey
)

if (error) {
  // Handle error
} else {
  // Navigate to checkout
}
```

### Endpoints

All endpoints are called from the frontend and are currently served by Next.js:

- `GET /api/products` — List all products with stock
- `GET /api/warehouses` — List active warehouses
- `POST /api/reservations` — Create a reservation
- `GET /api/reservations/:id` — Get reservation details
- `POST /api/reservations/:id/confirm` — Confirm payment
- `POST /api/reservations/:id/release` — Cancel reservation
- `POST /api/cron/expire-reservations` — Batch expire stale reservations
- `POST /api/cron/cleanup-idempotency` — Clean up old idempotency records

### Error Responses

All errors are serialized with a consistent format:

```typescript
{
  error: "ERROR_CODE",        // INSUFFICIENT_STOCK, RESOURCE_LOCKED, etc.
  message: "User-friendly",
  available?: 5,              // For INSUFFICIENT_STOCK
  status: 400 | 409 | 410 | 423 | 500
}
```

## Styling

### Tailwind CSS
- Custom color tokens defined in `tailwind.config.ts`
- Global utilities in `app/globals.css`
- Component classes in individual files

### Design System
- **Colors:** Slate (neutral), Amber (warning), Red (danger), Green (success)
- **Spacing:** 4px base unit (p-2, p-4, etc.)
- **Typography:** Inter font, sans-serif

### Components
- Base components from shadcn/ui: Button, Card, Badge, Separator
- Custom components built with Tailwind

## Scripts

### Development Scripts

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production build
pnpm start

# Run linter
pnpm lint

# Type check
pnpm typecheck

# Reset stock for testing
pnpm reset-stock

# Stress test (50 concurrent reservations)
pnpm stress-test
```

### Database Scripts

These are run from the root, but affect the frontend:

```bash
pnpm db:migrate:dev    # Create migration
pnpm db:migrate:deploy # Deploy migration
pnpm db:seed           # Seed database
```

## Environment Variables

Required in `.env.local`:

```env
DATABASE_URL=postgresql://...           # Supabase pooler URL
DIRECT_URL=postgresql://...             # Supabase direct connection
UPSTASH_REDIS_REST_URL=https://...      # Upstash Redis REST API
UPSTASH_REDIS_REST_TOKEN=...            # Upstash Redis API key
CRON_SECRET=...                         # Secret for cron endpoints
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Frontend URL (optional)
RESERVATION_TTL_SECONDS=600             # Reservation timeout (default: 600)
```

## Testing

### Manual Testing
1. Open http://localhost:3002
2. Click "Reserve" on any product
3. Confirm the checkout page appears with countdown
4. Click "Confirm" or wait for expiry

### Stress Test
```bash
pnpm stress-test
```

Fires 50 concurrent POST /api/reservations against a single unit:
- ✅ Expects exactly 1 success (201)
- ✅ Expects ~49 conflicts (423 LOCKED)
- ✅ Expects 0 server errors

Result validates that the Redis locking strategy prevents race conditions.

## Performance Notes

- Product listing is `force-dynamic` — no caching, always fresh stock
- Countdown timer recomputes from ISO string every second (never drifts)
- Quantity input bounded to [1, available]
- Button disabled while loading

## Known Limitations

- Seeded product IDs are custom strings (prod_vitd) not CUIDs
- ID validation loosened from `z.cuid()` to `z.string().min(1)`
- Quantity hardcoded to 1 before selecting (now has input)
- SKU not copyable before (now has copy button)
- Only 1 port tested (3000/3001/3002 auto-fallback)

## Future Improvements

- [ ] Extract API routes to separate backend package
- [ ] Add product images and detailed descriptions
- [ ] Add wishlists and saved items
- [ ] Add order history and tracking
- [ ] Add push notifications on reservation expiry
- [ ] Add payment processing integration
- [ ] Add admin dashboard for stock management
- [ ] Add analytics and observability

## License

Private — Allo Inventory Team
