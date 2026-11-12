# pra-api: instructions for AI agents

Management API of the Marlink PRA Platform (NestJS 11, TypeScript 5, CQRS, TypeORM, MariaDB). Public contract for the PRA Console and the SOC integration; delegates every BeyondTrust operation to pra-sync-api.

Last reviewed: 2026-11-12

Workspace-wide rules (hard boundaries, git conventions, documentation duty, communication) are in [../AGENTS.md](../AGENTS.md) and are not repeated here. This file holds the rules that are specific to this repository and routes to the detail documents.

## Read first

1. The workspace instructions in `../AGENTS.md` and the knowledge base in `../docs/knowledge/` (start at [index.md](../docs/knowledge/index.md), then [pra-api.md](../docs/knowledge/pra-api.md) and the domain files of your area), when this repository is checked out inside the `pra-platform` workspace.
2. The detail document for your task:

| Task | Read |
|---|---|
| Set up and run locally, environment variables | [docs/guides/QUICK_START.md](docs/guides/QUICK_START.md) |
| New module, new endpoint in an existing module, API contract change | [docs/guides/ADDING_NEW_MODULE.md](docs/guides/ADDING_NEW_MODULE.md) |
| Contract change that touches the console or pra-sync-api (checklist) | [../docs/knowledge/cross-repo-contracts.md](../docs/knowledge/cross-repo-contracts.md) |
| Layers, request lifecycle, multi-tenancy, access control | [docs/architecture/SYSTEM_OVERVIEW.md](docs/architecture/SYSTEM_OVERVIEW.md), [docs/architecture/MODULE_DEPENDENCIES.md](docs/architecture/MODULE_DEPENDENCIES.md) |
| CQRS patterns with code examples | [docs/architecture/CQRS_IMPLEMENTATION.md](docs/architecture/CQRS_IMPLEMENTATION.md) |
| Schema changes, indexes, pre-startup migrations | [docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md) |
| Postman collection and its end-of-iteration refresh | [postman/README.md](postman/README.md) |

## Commands

| Purpose | Command |
|---|---|
| Install | `npm ci` |
| Unit tests | `npx jest` or `npx jest <path>` |
| Type check | `npx tsc -p tsconfig.build.json --noEmit` |
| Build | `npm run build` |
| Lint | `npx eslint <changed files>` (`npm run lint` runs `--fix` on the whole repository) |
| Local DB | `npm run db:start:local` |
| Postman collection | `npm run postman:generate`, `npm run postman:check`, `npm run postman:export:console`, cloud copy `npm run postman:cloud:diff` and `npm run postman:cloud:push`; generator tests `npm run postman:test` ([postman/README.md](postman/README.md)) |

## System boundaries

- pra-api is the management and orchestration boundary between the PRA Console (upstream caller) and pra-sync-api (downstream integration backend). Both APIs use the same MariaDB server.
- BeyondTrust integration logic belongs in pra-sync-api adapters, never in the console and never duplicated in pra-api. Frontend concerns (UI shaping, view state) stay out of backend contracts unless the API design requires them.
- pra-sync-api owns the shared base schema and is the authoritative writer of the shared domain tables. Avoid local-only properties in pra-api. The preferred pattern is to add the field natively in pra-sync-api (model, entity, commands, DTOs, handlers) and proxy it through pra-api without special handling.
- A change of paths, headers, DTO shapes, status or error shapes, authentication behaviour or configuration keys is a coupled change. Apply [../docs/knowledge/cross-repo-contracts.md](../docs/knowledge/cross-repo-contracts.md): name the impacted repositories, the compatibility class and the rollout order, and prefer backward compatible changes.

## CQRS and module conventions

- Writes live in command handlers, reads in query handlers, and controllers stay thin: validate the DTO, read headers through the existing decorators, delegate to `CommandBus` or `QueryBus`. Never call a handler directly.
- Module layout: `controllers`, `commands` and `queries` (each with `handlers`), `events`, `dtos`, `models`, `repositories`, `pipes`, and `sagas` or `workflows` where needed. Operation and DTO names follow Create, Retrieve, Modify, Delete. Reuse the interceptors, pipes and services of neighbouring modules before adding an abstraction.
- Register every new handler in the module's `CommandHandlers` or `QueryHandlers` array and in the providers; an unregistered handler is silently never discovered. Run `npm run build` after module wiring changes.
- Keep request correlation with `X-Transaction-Id` through the existing transaction decorators and utilities.
- ESLint (strict type-checked) enforces: no `any`, no floating promises, explicit member accessibility, no `I` prefix on interfaces, no leading underscore on members, `static readonly` constants in `UPPER_CASE`.

## Tenant and scope safety

- `X-Tenant-Id` is the BeyondTrust instance id, never a customer or business unit id. It is required on tenant-aware endpoints. Read it with `ApiTenantIdHeader` and `TenantIdHeader`, never by parsing the header manually. Use it directly as the instance id; do not navigate through `CustomerEntity` to reach the instance.
- Propagate `tenantId` and the transaction id explicitly from controller through command or query to every service, repository and pra-sync-api call. Never default or re-derive the tenant; no default-tenant fallback and no silent scope expansion.
- Keep `AccessGuard` and the existing scope interceptors and request pipes (business units, customers, jump groups) on protected modules. Repository and pra-sync-api filters stay explicitly scoped.
- A change to a repository filter, pipe, event, saga or workflow needs at least one assertion for scope or tenant isolation. Before finishing, ask: can this change read or write outside the caller's scope, is `tenantId` present on every tenant-aware path, do logs and errors keep the transaction id without leaking data of other tenants.

## Rules specific to this repository

- Git: integration branch `develop`, release branch `main`, feature branches from `develop`; commit and merge conventions in [../AGENTS.md](../AGENTS.md) section 4.
- Response DTOs are consumed by the console and by SOC consumers: additive changes only unless a breaking change is approved and versioned (checklist: [../docs/knowledge/cross-repo-contracts.md](../docs/knowledge/cross-repo-contracts.md)).
- Schema changes: hand-written, idempotent, re-runnable scripts in `src/migration/scripts/`, registered in `src/migration/run-migrations-before-startup.ts`. Local-only columns here need a reason (see System boundaries). Details: [docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md). TypeORM `synchronize` is active whenever `ENV` is not `production`.
- Configuration is read through `AppConfigService` (env var first, then `src/app-config/consts/default-app-config.const.ts`). Environment values for DEV, PP, PROD are not in this repository.
- Site ingestion (`src/site/`) and BeyondTrust users (`src/user/`): read `../docs/knowledge/domains/site-ingestion.md` and `../docs/knowledge/domains/external-users.md` before changing them. Invariants:
  - Never create a local account for an unresolved non-local user.
  - Delete a BeyondTrust account, local or non-local, only when it holds no other site role on the same BeyondTrust instance. Use `SiteUserReferences` (`src/site/workflows/users/`) for that check; it covers site managers, auditors and support team members.
  - Remove a group policy membership only when no remaining role of the account needs it (`SiteGroupPolicyKeys`).
  - Retain site users that could not be processed.
  - `PATCH /users/:id` forwards nothing but the allowed properties for a non-local user: `username`, `password`, `passwordExpirationDate`, the two-factor flag, failed logins, the reset flag, display name and email are owned by the identity provider. An unchanged value is dropped, a changed one raises `NonLocalUserModificationException` (422); BeyondTrust rejects these properties even with the value it already holds (MARLINKPRA-79). Only login allowed and the preferred email language still reach BeyondTrust.
  - Group policies that exist once per Business Unit are found, never created (`BuGroupPolicyLookupWorkflow`). BeyondTrust adds a new external user to `GP_<BU>_SAML_DEFAULT` at the first sign-in; the role workflows remove an external site user from the policy of the customer's Business Unit as their last step, after the role policies are assigned. The platform never adds that membership, and role removal does not touch it. The name map `BU_SAML_DEFAULT_GP_MAP` is mirrored in pra-console (`src/app/shared/helpers/pra-data-filter.ts`) and both have to change together.
  - Names of the policies the ingestion creates come from the static `groupPolicyNameFor()` of their workflows (`src/site/workflows/group-policies/`, `src/customer/workflows/`). Never rebuild such a name elsewhere. A `LIKE` pattern with a customer name may narrow a search but never decides that an object belongs to the customer: longer customer names match too, and `_` is a wildcard. Known open exception: `SupportTeamArtifactsWorkflow` (customer deletion, see `../docs/knowledge/domains/external-users.md`).
- Customer deactivation and reactivation change the login only of the users chosen by `CustomerExclusiveUsersWorkflow` (`src/customer/workflows/`): direct members of the customer's own policies whose site roles on the same instance all belong to the customer. A user whose roles cannot be read is reported and left unchanged.
- Stability invariants (release 3.2, see `../docs/knowledge/investigations/r3.2-stability/`):
  - System log and monitoring rows are written only through `LogService` and `MonitoringRecordWriterService`, which queue them in a bounded `BufferedEntityWriter`. Never insert into `pra_logs` or the monitoring tables on a request path and never wait for the database to log. Pass payloads as objects, so `LogService` redacts secrets.
  - Database access goes through the repository services and `DatabaseConnectionUtility` (bounded connection acquire, query runner released in `finally`).
  - Every call to pra-sync-api sets a timeout from `AppConfigService.praSyncApiTimeouts`. A timeout after a write means the outcome is unknown: report it, never repeat the write automatically.
  - Health: `/health/live` (process), `/health/ready` (database only), `/health` (diagnostics). pra-sync-api is a non-critical check; readiness never depends on it.
  - The manual scan status is tenant-scoped and in memory (`DiscrepancyScanStatusService`); writes go through commands, also for jobs (`EnforceRetentionCommand`).
- Tests: every behaviour change comes with a unit test next to the changed file (`*.spec.ts`). Keep the 3.1 console payload pin in `src/site/dtos/inputs/create-site.dto-input.spec.ts` green.
- Postman collection: `postman/collections/Marlink PRA API/`, `postman/exports/` and `postman/reports/` are generated by `scripts/postman/` from the registered routes and DTO metadata; never edit them by hand. After a route, guard, header or DTO change run `npm run postman:generate` and `npm run postman:check`; a new guard, interceptor, pipe or custom parameter decorator must be classified in `scripts/postman/config/components.config.ts`. New operations stay out of the customer export (Console download) until they are approved in `scripts/postman/config/customer-export.config.ts`; the folders Internal, Discrepancies, and Logs and Monitoring and the `AppController` routes are never exported. `.postman/resources.yaml` binds the generated collection to the Postman cloud collection; keep it valid and never push with `force-sync`. End-of-iteration procedure: [postman/README.md](postman/README.md#end-of-iteration-procedure).
- Container image: `Dockerfile` pins an exact Node.js release (`node:24.22.1-alpine3.24`). Node.js validates outbound TLS against the root store compiled into the Node.js binary, so the Node.js release, not the OS `ca-certificates`, decides which CAs this service trusts. Raise the pin deliberately (Node.js security releases), keep pra-api and pra-sync-api on the same release, and never return to a floating tag such as `node:lts-alpine` (SEC-01, `../docs/knowledge/operations/environments-and-delivery.md`).

## Documentation duty

Update the knowledge base after each issue (`../docs/knowledge/conventions.md`). Repository docs under `docs/` are committed together with the code change they describe.
