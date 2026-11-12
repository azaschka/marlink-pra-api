# Marlink PRA API

Management API of the Marlink PRA Platform. It administers BeyondTrust Privileged Remote Access (PRA) for Marlink customers and is the public contract for the PRA Console and the SOC integration. Every BeyondTrust operation is delegated to [pra-sync-api](https://github.com/azaschka/marlink-pra-sync-api).

- Customers and business units with scoped access keys (multi-tenant isolation)
- Sites, users, teams, group policies, jump groups, jumpoints, jump clients, jump items, jump policies, session policies
- SOC projections, license usage, jumpoint node deployment
- Discrepancy detection and synchronisation with BeyondTrust

## Repositories

| Repository | Role |
|---|---|
| [azaschka/marlink-pra-api](https://github.com/azaschka/marlink-pra-api) (this one) | Management API |
| [azaschka/marlink-pra-sync-api](https://github.com/azaschka/marlink-pra-sync-api) | BeyondTrust integration, shared base schema |
| [azaschka/marlink-pra-console](https://github.com/azaschka/marlink-pra-console) | Angular admin console (PRA Admin) |
| [azaschka/marlink-pra-platform](https://github.com/azaschka/marlink-pra-platform) | Workspace: shared knowledge base, agent instructions |

All repositories are private. Request path: console, then pra-api, then pra-sync-api, then BeyondTrust. pra-api and pra-sync-api use the same MariaDB server.

## Technology

NestJS 11, TypeScript 5, `@nestjs/cqrs`, TypeORM with MariaDB, Passport (API key, JWT, local), Swagger/OpenAPI, MJML and Handlebars email templates, Helmet, `@nestjs/throttler`, Jest, ESLint, Prettier. Delivered as a container image (Node.js release pinned in the `Dockerfile`).

## Architecture in short

- Domain modules under `src/`, each with controllers, commands, queries, events, DTOs, models, repositories, pipes and where needed sagas and workflows.
- CQRS: writes in command handlers, reads in query handlers, thin controllers. Domain events and sagas drive cross-module workflows.
- Layered access control on every protected route: `AccessGuard` (`X-Access-Key`), scope interceptors (business units, customers, jump groups), request pipes (ownership and scope checks).
- `X-Tenant-Id` carries the BeyondTrust instance id; `X-Transaction-Id` correlates a request across log entries.

Details: [System Overview](docs/architecture/SYSTEM_OVERVIEW.md).

## Documentation

| Topic | Document |
|---|---|
| Rules for contributors and AI agents, router to everything below | [AGENTS.md](AGENTS.md) |
| Local setup, environment variables, first calls | [Quick Start](docs/guides/QUICK_START.md) |
| New module, new endpoint, API contract change | [Adding New Module](docs/guides/ADDING_NEW_MODULE.md) |
| Layers, request lifecycle, multi-tenancy | [System Overview](docs/architecture/SYSTEM_OVERVIEW.md) |
| Module graph, access control flow | [Module Dependencies](docs/architecture/MODULE_DEPENDENCIES.md) |
| CQRS patterns with examples | [CQRS Implementation](docs/architecture/CQRS_IMPLEMENTATION.md) |
| Schema scripts and indexes | [Database Migrations](docs/DATABASE_MIGRATIONS.md) |
| Postman collection (generated from code) | [postman/README.md](postman/README.md) |
| Customer and site workflow diagram | [docs/customer-and-site-workflow.drawio](docs/customer-and-site-workflow.drawio) |

The platform knowledge base (domains, operations, decisions, investigations) lives in the workspace repository `marlink-pra-platform` under `docs/knowledge/`, one level above this repository when it is checked out inside the `pra-platform` workspace: [../docs/knowledge/index.md](../docs/knowledge/index.md).

## Development

```bash
npm ci
npm run start:dev          # watch mode
npm run build              # production build
npx jest                   # unit tests
npx tsc -p tsconfig.build.json --noEmit
npx eslint <changed files> # npm run lint applies --fix to the whole repository
npm run db:start:local     # local MariaDB container
```

Branches: feature branches from `develop`, release branch `main`. Commit subject `<ID>: <imperative summary>`.

## API documentation

- Swagger UI: `/open-api` on the running service (for example `http://localhost:9000/open-api`).
- Postman collection, including the routes hidden from Swagger, generated from the code with `npm run postman:generate`; see [postman/README.md](postman/README.md). Never edit the generated files by hand.

## Monitoring and health

- `GET /health/live`: liveness (process)
- `GET /health/ready`: readiness (database only)
- `GET /health`: diagnostics with `overallStatus` and a `checks` map; pra-sync-api is a non-critical check
- System log (`pra_logs`) and request statistics (`pra_monitorings`) are written asynchronously through a bounded buffer and removed after 90 days by the retention job.
