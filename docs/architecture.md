# Architecture Overview

## Project Structure

```text
allo-inventory/
├── .env.example
├── docker-compose.yml
├── package.json
├── README.md
├── docs/
│   ├── architecture.md
│   ├── security.md
│   └── runbook.md
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── styles/
│   └── tests/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── api/
│   │   ├── common/
│   │   ├── config/
│   │   ├── infrastructure/
│   │   ├── modules/
│   │   ├── services/
│   │   └── main.ts
│   └── tests/
├── database/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
├── config/
│   ├── docker/
│   ├── ci-cd/
│   └── monitoring/
├── monitoring/
│   ├── prometheus/
│   └── grafana/
├── ops/
│   └── runbooks/
└── scripts/
```

## Main Folder Purpose

- `frontend/`: Next.js UI and BFF routes. Contains presentation components, hooks, client API wrappers, and browser-facing state.
- `backend/`: Domain and application logic. Keeps controllers thin and pushes business rules into services, repositories, and module-level code.
- `database/`: Canonical database artifacts. Holds schema, indexes, seeds, and migration assets.
- `config/`: Deployment and environment assets for Docker, CI/CD, and operational defaults.
- `docs/`: Architecture, security, and operational guidance.
- `monitoring/`: Prometheus and Grafana configuration for metrics and dashboards.
- `ops/`: Runbooks and incident response notes.
- `scripts/`: Developer and maintenance automation such as seed, migrate, cleanup, and stress-test helpers.

## Data Flow

1. A user action starts in `frontend/app/*` or a BFF route under `frontend/app/api/*`.
2. The frontend validates basic input, then calls the backend API with a typed service wrapper from `frontend/services/*`.
3. The backend route enters middleware, resolves auth and request metadata, and dispatches to a controller.
4. The controller delegates to a module service, which applies business rules and transaction boundaries.
5. The service calls repositories for persistence and infrastructure services for Redis, locking, and caching.
6. The repository writes to PostgreSQL via Prisma and returns a domain result.
7. The controller serializes the response and returns it to the client.

For reservations, the flow is typically: validate request → check idempotency → acquire lock → re-check stock in a transaction → write reservation and event → release lock → return response.

## Module Interaction

- Controllers translate HTTP concerns into application commands.
- Services coordinate repositories, cache, and transaction logic.
- Repositories isolate database queries and make persistence replaceable.
- Infrastructure clients provide Redis, Prisma, queue, and cron integrations.
- Shared middleware handles authentication, rate limiting, errors, and structured logging.

## Business Logic Placement

Business logic belongs in `backend/src/modules/*/services` and supporting domain files such as state machines and validators. The controller layer should remain thin. Repositories should only contain data access logic. This keeps reservation rules, stock transitions, and idempotency behavior centralized and testable.

## Scaling Enhancements

- Split bounded contexts into microservices only when team size or load justifies the added operational cost.
- Add Redis caching for hot reads and lock coordination, with database row locks as the source of truth.
- Introduce a queue worker for non-urgent jobs such as expiration cleanup, notifications, and analytics events.
- Consider read replicas for product browse traffic if reads dominate writes.
- Partition or archive audit/event tables when they grow large.

## Security Practices

- Keep secrets out of git and load them from environment variables or a vault.
- Validate all request input at the API boundary.
- Enforce RBAC for operational and admin routes.
- Use parameterized queries and Prisma-generated access patterns.
- Add security headers, TLS, and rate limiting at the edge or API layer.
- Log authentication failures and privilege changes separately.

## Logging and Monitoring

- Emit structured JSON logs with a request id and user id where available.
- Track reservation success, stock contention, lock failures, and serialization retries.
- Expose basic health and readiness endpoints.
- Use Prometheus for metrics and Grafana for dashboards.
- Alert on Redis failures, DB saturation, high 409 rates, and cron job failures.

## CI/CD Suggestions

- Run lint, typecheck, and tests on every pull request.
- Build frontend and backend artifacts in CI.
- Scan dependencies and container images before deployment.
- Promote changes through dev, staging, and production environments with approvals.
- Use smoke tests after deployment to verify key reservation paths.

## Where To Look First

- UI changes: `frontend/app/`, `frontend/components/`, `frontend/hooks/`
- API changes: `backend/src/api/`
- Reservation rules: `backend/src/modules/reservation/`
- Data model: `backend/prisma/schema.prisma` and `database/schema/`
- Operations: `docs/`, `ops/`, `monitoring/`

