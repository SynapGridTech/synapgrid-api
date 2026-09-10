# SynapGrid API

Industrial-grade REST API for [SynapGrid Technologies](https://www.synapgrid.net/) — support tickets, newsletter subscriptions, services catalog, and administration.

Built with **NestJS 11**, **TypeORM**, and **TypeScript** (strict mode).

## Features

- **Support Tickets** — public "Open a Ticket" flow with opaque tracking tokens, reference codes (`SG-XXXXXX`), threaded conversations, and staff management (status, priority, assignment)
- **Newsletter** — double opt-in subscriptions with hashed confirmation tokens, unsubscribe flow, and admin subscriber management
- **Services Catalog** — public read-only catalog with slug routing, admin CRUD, ordering, and feature lists
- **Auth** — JWT access tokens (15 min) + rotating refresh tokens with reuse detection (token-family revocation), argon2id password hashing, RBAC (`admin`, `support`)

### Industrial-grade defaults

| Concern | Implementation |
| --- | --- |
| Validation | Global `ValidationPipe` with whitelist + DTO transforms |
| Error format | RFC 7807-style envelope via global exception filter |
| Security headers | `helmet` |
| Rate limiting | `@nestjs/throttler` — global + stricter per-route budgets on public endpoints |
| Secrets | Never returned (`@Exclude()` + global `ClassSerializerInterceptor`); tokens stored hashed (SHA-256) |
| Correlation | `X-Request-Id` middleware + HTTP request logging |
| Compression | `compression` |
| Migrations | Versioned SQL migrations (SQLite for dev, PostgreSQL for prod) |
| Health | `/api/v1/health` liveness + DB readiness (Terminus) |
| Docs | Swagger UI at `/docs` |
| Tests | Unit tests (services, utils, config) + 25 e2e tests over the full HTTP surface |

## Project structure

```
src/
├── common/          # guards, decorators, filters, interceptors, pagination, utils
├── config/          # env validation (Joi), TypeORM options builder
├── database/
│   ├── migrations/  # versioned SQL migrations
│   └── seeds/       # admin + demo services seeding
├── infrastructure/  # mailer (nodemailer)
├── modules/
│   ├── auth/        # login/refresh/logout, JWT strategy, admin user CRUD
│   ├── users/       # user entity + service
│   ├── tickets/     # public ticket flow + staff management
│   ├── newsletter/  # double opt-in subscriptions
│   └── services/    # services catalog
└── health/          # liveness/readiness
test/                # e2e suite (supertest over the real app)
```

## Getting started

```bash
npm install
cp .env.example .env          # defaults work out of the box (SQLite)
npm run migration:run         # create schema
npm run seed                  # bootstrap admin + demo services
npm run dev                   # start in watch mode
```

Default admin (development only): `admin@synapgrid.net` / `Admin@123!` — **change `SEED_ADMIN_PASSWORD` before first production seed**.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start in watch mode |
| `npm run build` | Production build |
| `npm run start:prod` | Run compiled output |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests (isolated temp SQLite DB) |
| `npm run test:cov` | Coverage report |
| `npm run lint` / `lint:check` | ESLint |
| `npm run migration:generate` / `run` / `revert` | Migrations |
| `npm run seed` | Seed admin + demo services |

## API overview

Base URL: `http://localhost:3000/api/v1` — full docs at `http://localhost:3000/docs`.

### Public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness + DB readiness |
| `POST` | `/auth/login` | Get access + refresh tokens (rate limited) |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke a refresh token |
| `POST` | `/tickets` | Open a ticket → returns `reference` + `trackingToken` (shown once) |
| `POST` | `/tickets/track` | Track a ticket with `reference` + `requesterEmail` |
| `GET` | `/tickets/:trackingToken` | Full thread by tracking token |
| `POST` | `/tickets/:trackingToken/replies` | Reply to your ticket |
| `POST` | `/newsletter/subscribe` | Request subscription (double opt-in) |
| `POST` | `/newsletter/confirm` | Confirm with emailed token |
| `POST` | `/newsletter/unsubscribe` | Unsubscribe with token |
| `GET` | `/services` | Published services |
| `GET` | `/services/slug/:slug` | Service detail by slug |

### Authenticated (Bearer token)

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/auth/me` | any |
| `GET`/`POST` | `/auth/users`, `PATCH /auth/users/:id/status` | admin |
| `GET` | `/tickets` (paginated, filterable) | support/admin |
| `GET` | `/tickets/stats/summary` | support/admin |
| `GET`/`PATCH` | `/tickets/admin/:id` | support/admin |
| `POST` | `/tickets/admin/:id/replies` | support/admin |
| `GET` | `/newsletter/subscribers`, `/newsletter/stats` | support/admin |
| `PATCH` | `/newsletter/subscribers/:id` | admin |
| `GET`/`POST`/`PATCH`/`DELETE` | `/services/admin…` | support (read) / admin (write) |

### Example: open a ticket

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -d '{"requesterName":"Jane Customer","requesterEmail":"jane@example.com",
       "subject":"Gateway integration failing","body":"We keep getting 502s…"}'

# → {"ticket":{"reference":"SG-BDCEVQ", …},"trackingToken":"…"}
```

### Example: authenticate

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@synapgrid.net","password":"Admin@123!"}'

curl http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer <accessToken>"
```

## Configuration

All settings are validated at boot (Joi) — see `.env.example`. Key choices:

- `DB_TYPE` — `sqlite` (zero-config dev) or `postgres` (production; requires `DB_HOST/PORT/USERNAME/PASSWORD`)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — **required**, min 32 chars
- `MAIL_ENABLED` — `false` logs emails to console instead of sending (SMTP settings otherwise)
- Real environment variables always override `.env` file values (container-friendly)

## Error format

All errors share one envelope:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["A valid email address is required"],
  "path": "/api/v1/tickets",
  "timestamp": "2026-09-10T23:21:21.000Z"
}
```

## Pagination

List endpoints return a consistent envelope:

```json
{
  "items": [...],
  "meta": { "totalItems": 45, "itemCount": 20, "itemsPerPage": 20, "totalPages": 3, "currentPage": 2 },
  "links": { "first": "…?page=1", "previous": "…?page=1", "next": "…?page=3", "last": "…?page=3" }
}
```
