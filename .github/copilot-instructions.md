# Copilot Instructions

Guidance for AI coding agents working in this repository.

## Project Snapshot

- Stack: NestJS 11, TypeScript 5, CQRS, TypeORM, MariaDB/MySQL.
- Purpose: management API for BeyondTrust PRA with multi-tenant customer/business-unit isolation.
- Architecture center: domain modules in src/ with controllers, commands, queries, events, repositories, pipes, and (where needed) sagas/workflows.

## System Boundaries and Dependencies

- This service is the central management API in the PRA stack.
- Primary upstream client: PRA Console frontend.
- Primary downstream service: PRA Sync API for BeyondTrust communication.
- Storage boundary: this service owns its local PRA domain tables and access/scope enforcement.
- Do not push direct BeyondTrust integration logic into PRA Console.
- Do not duplicate PRA Sync API responsibilities inside PRA API when the behavior belongs to sync adapters.
- If an API contract change affects Console or Sync API, document and coordinate the corresponding change in the sibling repo.

## Coupled-Change Policy

- Mark changes as coupled across at least two repositories when contract surface changes occur (headers, DTO shapes, status/error shape, auth behavior).
- Use the shared checklist in [.github/CROSS_REPO_CONTRACT_CHECKLIST.md](./CROSS_REPO_CONTRACT_CHECKLIST.md) and include affected repos in PR notes.
- For coupled changes, document compatibility impact and rollout order.

## Fast Start Commands

- Install: npm ci
- Run (dev): npm run start:dev
- Build: npm run build
- Lint (auto-fix): npm run lint
- Unit tests: npm test
- Coverage: npm run test:cov
- E2E tests: npm run test:e2e
- Start local DB container: npm run db:start:local

## Coding Rules That Matter Here

- Preserve CQRS split: writes in command handlers, reads in query handlers, controllers stay thin.
- Keep request correlation with X-Transaction-Id (use existing transaction decorators/utilities).
- Enforce access and scoping patterns already used by modules:
  - AccessGuard for API-key protection,
  - scope interceptors (business units/customers/jump groups),
  - request pipes for scope-safe validation.
- For tenant-aware modules, propagate tenantId from controller to downstream command/query/service calls; do not re-derive or default it.
- Register every new handler in module provider arrays (...QueryHandlers / ...CommandHandlers) so Nest CQRS discovers it.
- Reuse existing module patterns from neighboring domains before introducing new abstractions.

## Linting, Naming, and Quality Rules

- Run lint before completion; repository uses strict TypeScript-ESLint type-checked rules.
- Avoid any and floating promises.
- Keep explicit member accessibility in classes.
- Naming conventions from ESLint apply:
  - no I-prefix for interfaces,
  - no leading underscore member names,
  - static readonly constants in UPPER_CASE.
- Keep DTO and operation naming consistent with module conventions (Create/Retrieve/Modify/Delete).

## Validation Checklist Before Finalizing

- npm run lint
- npm test (or targeted tests if full run is too expensive)
- npm run build when handlers/modules/providers were changed
- If controller/repository code changed, verify access + scope + tenant flow is still enforced end-to-end.
- If startup/config behavior changed, verify app bootstrap behavior in main.ts remains consistent.

## High-Value References (Link, Do Not Duplicate)

- Project overview: [README.md](../README.md)
- Quick start and env setup: [docs/guides/QUICK_START.md](../docs/guides/QUICK_START.md)
- Architecture overview: [docs/architecture/SYSTEM_OVERVIEW.md](../docs/architecture/SYSTEM_OVERVIEW.md)
- CQRS patterns: [docs/architecture/CQRS_IMPLEMENTATION.md](../docs/architecture/CQRS_IMPLEMENTATION.md)
- Module dependency map: [docs/architecture/MODULE_DEPENDENCIES.md](../docs/architecture/MODULE_DEPENDENCIES.md)
- Add module workflow: [docs/guides/ADDING_NEW_MODULE.md](../docs/guides/ADDING_NEW_MODULE.md)
- DB migrations and index strategy: [docs/DATABASE_MIGRATIONS.md](../docs/DATABASE_MIGRATIONS.md)
- Upstream UI repo: [pra-console/README.md](../../pra-console/README.md)
- Downstream sync repo: [pra-sync-api/README.md](../../pra-sync-api/README.md)
- Shared contract checklist: [.github/CROSS_REPO_CONTRACT_CHECKLIST.md](./CROSS_REPO_CONTRACT_CHECKLIST.md)
