# Quick Start Guide

Set up pra-api locally, run it and make a first call. Repository rules for agents and contributors are in [AGENTS.md](../../AGENTS.md); the architecture is described in [System Overview](../architecture/SYSTEM_OVERVIEW.md).

## Prerequisites

- Node.js 24.22.1, the release pinned in the `Dockerfile` (the Node.js release decides which TLS root CAs the service trusts; do not use a floating tag)
- npm
- MariaDB 10.x (the Docker container started by `npm run db:start:local` is the intended local setup)
- Git

pra-api needs a running [pra-sync-api](https://github.com/azaschka/marlink-pra-sync-api) for every operation that touches BeyondTrust. Both services use the same database.

## Installation

```bash
git clone https://github.com/azaschka/marlink-pra-api.git
cd marlink-pra-api
npm ci
```

Inside the `pra-platform` workspace the repository is already checked out as `pra-api/`.

## Environment variables

The environment file is `environments/.env` (path set in `src/app-config/app-config.module.ts`). It is ignored by git, as are `.local.env` and `*.local.env`. Every value is read through `AppConfigService`: environment variable first, then the default in `src/app-config/consts/default-app-config.const.ts`. Values for DEV, PP and PROD are not stored in this repository.

Minimal local file:

```bash
# Environment ("production" or "prod" turns TypeORM synchronize off)
ENV=development

# Server (main.ts falls back to 3001 when PORT is unset)
PORT=9000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your-password
DB_NAME=pra

# Authentication
PRA_API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRY=24h

# Downstream and console URLs
PRA_SYNC_API_BASE_URL=http://localhost:9001
HEALTH_PING_CHECK_PRA_SYNC_API_URL=http://localhost:9001/health
BEYONDTRUST_CONSOLE_URL=https://your-instance.beyondtrustcloud.com
PRA_ADMIN_CONSOLE_URL=http://localhost:4200/

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password

# Rate limiting (defaults shown)
THROTTLE_IS_ENABLED=true
THROTTLE_TTL_IN_MS=60000
THROTTLE_LIMIT=1500
```

Optional tuning (defaults shown):

```bash
# Calls to pra-sync-api
PRA_SYNC_API_TIMEOUT_IN_MS=300000
PRA_SYNC_API_SCAN_TIMEOUT_IN_MS=1500000
PRA_SYNC_API_FILE_TRANSFER_TIMEOUT_IN_MS=1800000
PRA_SYNC_API_DOWNLOAD_IDLE_TIMEOUT_IN_MS=120000

# Retention and observability
LOG_RETENTION_DAYS=90
MONITORING_RETENTION_DAYS=90
CRON_JOB_LOG_RETENTION=17 * * * *
RETENTION_DISTRIBUTED_LOCK_ENABLED=true
RESOURCE_REPORT_INTERVAL_IN_MS=300000
HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB=512
HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT=80
```

Notes:

- Numeric values are validated at startup; an invalid value falls back to the default and is reported once.
- Set `RETENTION_DISTRIBUTED_LOCK_ENABLED=false` on Galera (no `GET_LOCK`). Keep `CRON_JOB_LOG_RETENTION` hourly: a daily schedule lets rows reach 91 days.
- The fallback admin (emergency access) is not configurable through environment variables. Its enabled flag, username and bcrypt hash are defaults in `DefaultAppConfig`. Create a hash with `node scripts/generate-fallback-admin-hash.js "<password>"`.

## Database

```bash
npm run db:start:local
```

or start any MariaDB 10.x on port 3306 and create the database named in `DB_NAME`.

Schema handling at startup:

1. Hand-written pre-startup scripts run first (`src/migration/run-migrations-before-startup.ts`). Errors are logged and the startup continues.
2. Outside production TypeORM `synchronize` creates and alters tables from the entities.
3. In production `MigrationService` creates missing indexes from the entity metadata.

Details: [Database Migrations](../DATABASE_MIGRATIONS.md).

## Running

```bash
npm run start:dev      # watch mode
npm run start:debug    # debugger on port 9229
npm run build && npm run start:prod
```

Swagger UI: `http://localhost:9000/open-api` (host and port as configured). Routes hidden from Swagger are covered by the generated Postman collection ([postman/README.md](../../postman/README.md)).

## Tests and quality checks

```bash
npx jest                                    # unit tests (npm run test:cov for coverage in coverage/)
npx tsc -p tsconfig.build.json --noEmit     # type check
npx eslint <changed files>                  # lint; npm run lint runs --fix on the whole repository
npm run test:e2e                            # e2e suite in test/
```

## Authentication

| Method | Used for | How |
|---|---|---|
| `X-Access-Key` header | Most endpoints (`AccessGuard`) | Key with its business units, stored in `pra_access` |
| `X-API-Key` header | Service-to-service and console-only routes | Value of `PRA_API_KEY` |
| JWT | PRA admin sessions | `POST /auth/login` returns a token; send `Authorization: Bearer <token>` |
| Fallback admin | Emergency access | Defaults in `DefaultAppConfig`, see above |

Which route uses which scheme is listed per request in the generated [coverage report](../../postman/reports/coverage-summary.md).

## First calls

Health (no authentication):

```bash
curl http://localhost:9000/health
```

The response has an `overallStatus` (`healthy`, `degraded` with HTTP 200 for a warning or a non-critical failure such as an unreachable pra-sync-api, `unavailable` with HTTP 503 only when the database is down) and a `checks` map. The legacy `status`, `info`, `error` and `details` fields are kept for older consumers. Probes: liveness `/health/live`, readiness `/health/ready` (database only).

A scoped read. `X-Tenant-Id` is the BeyondTrust instance id, never a customer id:

```bash
curl "http://localhost:9000/users?publicDisplayNamePatterns=%Acme%" \
  -H "X-Access-Key: your-api-key" \
  -H "X-Tenant-Id: 1"
```

A write (business unit scoped) with a correlation id:

```bash
curl -X POST http://localhost:9000/customers \
  -H "Content-Type: application/json" \
  -H "X-Access-Key: your-api-key" \
  -H "X-Transaction-Id: $(uuidgen)" \
  -d '{ "key": "CUST001", "name": "Acme Corporation", "businessUnit": "BU1", "beyondtrustInstanceId": 1 }'
```

The exact DTOs are in Swagger and in the Postman collection.

## Project structure

```
src/
├── access/ auth/ app-config/   access keys and business units, authentication, configuration
├── customer/ site/ user/ team/ domain modules (CQRS: controllers, commands, queries, dtos, ...)
├── jump-group/ jumpoint/ jump-client/ jump-item/ jump-policy/ session-policy/
├── group-policy*/ user-group-policy/ team-user/ beyondtrust-instance*/
├── soc/ deployment/ discrepancy/ license-usage/
├── health/ log/ monitoring/ retention/ observability/ outbound-http/ job/
├── email/ maintenance/ migration/
└── core/ shared/ types/        cross-cutting commands, queries, services, filters, pipes
```

Module relationships: [Module Dependencies](../architecture/MODULE_DEPENDENCIES.md).

## Development workflow

1. Create a feature branch from `develop`.
2. Follow the conventions in [AGENTS.md](../../AGENTS.md): CQRS split, tenant and scope safety, additive contracts, a unit test next to every changed file.
3. For a new module or endpoint follow [Adding New Module](./ADDING_NEW_MODULE.md).
4. Run the checks above. Regenerate the Postman collection after route, guard, header or DTO changes.
5. Commit as `<ID>: <imperative summary>`. Pushing and merging are done by the maintainer.

## Debugging

- Correlation: send `X-Transaction-Id`; it appears in the system log entries of the request.
- System log: table `pra_logs`; request statistics: table `pra_monitorings` (both written asynchronously through a bounded buffer, see [System Overview](../architecture/SYSTEM_OVERVIEW.md)).
- Query logging: set `logging: true` in the `database` getter of `src/app-config/services/app-config.service.ts` for a local run only; do not commit it.

## Common issues

| Symptom | Check |
|---|---|
| Database connection fails | Database running, credentials in `environments/.env`, database `DB_NAME` exists. |
| `Cannot find module` | `rm -rf node_modules && npm ci`. |
| Port in use | Change `PORT`; find the process with `lsof -i :9000`. |
| Index or script migration did not run | Read the startup log; pre-startup scripts log and continue on error. |
| Timeout towards pra-sync-api | `PRA_SYNC_API_BASE_URL` reachable, pra-sync-api running; adjust the `PRA_SYNC_API_*_TIMEOUT_IN_MS` values. A timeout answers 504. |

## Security notes

- Never commit environment files; use separate keys per environment.
- Production values come from Kubernetes secrets; see [environments and delivery](../../../docs/knowledge/operations/environments-and-delivery.md).
- Keep throttling enabled in production, use a JWT secret of at least 32 characters and set `ENV=production` so that `synchronize` stays off.

## Build and delivery

```bash
npm run docker:build:api    # image build
npm run publish:api         # build, tag, log in to the registry, push
```

Container probes: liveness `/health/live`, readiness `/health/ready`. Deployment manifests and the delivery path are not part of this repository; see [environments and delivery](../../../docs/knowledge/operations/environments-and-delivery.md).
