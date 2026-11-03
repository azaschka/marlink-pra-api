# pra-api: instructions for AI agents

Management API of the Marlink PRA Platform (NestJS 11, TypeScript 5, CQRS, TypeORM, MariaDB). Public contract for the PRA Console and the SOC integration; delegates every BeyondTrust operation to pra-sync-api.

Last reviewed: 2026-11-03

## Read first

1. The workspace instructions in `../AGENTS.md` and the knowledge base in `../docs/knowledge/` (start at `index.md`, then `pra-api.md` and the domain files of your area), when this repository is checked out inside the `pra-platform` workspace.
2. [.github/copilot-instructions.md](.github/copilot-instructions.md) and the scoped rules in [.github/instructions/](.github/instructions/): CQRS domain patterns, system boundaries, tenant and scope safety. They are canonical for this repository; this file does not repeat them.
3. [.github/CROSS_REPO_CONTRACT_CHECKLIST.md](.github/CROSS_REPO_CONTRACT_CHECKLIST.md) for any contract change.
4. Architecture and guides in [docs/](docs/): `architecture/`, `guides/QUICK_START.md`, `guides/ADDING_NEW_MODULE.md`, `DATABASE_MIGRATIONS.md`.

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

## Rules specific to this repository

- Git: integration branch `develop`, release branch `main`, feature branches from `develop`. Commit subject `<ID>: <imperative summary>` (Jira key, RFQ requirement such as `R3.2-A003`, or internal issue id). No push, merge or deployment without explicit instruction.
- `X-Tenant-Id` is the BeyondTrust instance id. Propagate it explicitly; never default it.
- Response DTOs are consumed by the console and by SOC consumers: additive changes only unless a breaking change is approved and versioned.
- Schema changes: hand-written, idempotent, re-runnable scripts in `src/migration/scripts/`, registered in `src/migration/run-migrations-before-startup.ts`. pra-sync-api owns the shared base schema; local-only columns here need a reason. TypeORM `synchronize` is active whenever `ENV` is not `production`.
- Configuration is read through `AppConfigService` (env var first, then `src/app-config/consts/default-app-config.const.ts`). Environment values for DEV, PP, PROD are not in this repository.
- Site ingestion (`src/site/`) and BeyondTrust users (`src/user/`): read `../docs/knowledge/domains/site-ingestion.md` and `../docs/knowledge/domains/external-users.md` before changing them. Invariants:
  - Never create a local account for an unresolved non-local user.
  - Delete a BeyondTrust account, local or non-local, only when it holds no other site role on the same BeyondTrust instance. Use `SiteUserReferences` (`src/site/workflows/users/`) for that check; it covers site managers, auditors and support team members.
  - Remove a group policy membership only when no remaining role of the account needs it (`SiteGroupPolicyKeys`).
  - Retain site users that could not be processed.
  - `PATCH /users/:id` forwards nothing but the allowed properties for a non-local user: `username`, `password`, `passwordExpirationDate`, the two-factor flag, failed logins, the reset flag, display name and email are owned by the identity provider. An unchanged value is dropped, a changed one raises `NonLocalUserModificationException` (422); BeyondTrust rejects these properties even with the value it already holds (MARLINKPRA-79). Only login allowed and the preferred email language still reach BeyondTrust.
  - The member list of the Sync API (`RetrieveGroupPolicyMembersQuery`) is its mirror. "Not in the list" does not prove that a user is no member of a policy, because a membership made outside the platform arrives only with a scan. Before treating a membership as absent, ask BeyondTrust through `RemoveUserFromGroupPolicyCommand` (MARLINKPRA-81).
  - Group policies that exist once per Business Unit are found, never created (`BuGroupPolicyLookupWorkflow`). BeyondTrust adds a new external user to `GP_<BU>_SAML_DEFAULT` at the first sign-in. `SiteWorkflow` removes an external site user from the policy of the customer's Business Unit at the end of the run, once per user and only when all of its roles succeeded; the add endpoints of a single role do it after the role (MARLINKPRA-81). A problem there goes to the report and never fails the role in an ingestion run. The platform never adds that membership, and role removal does not touch it. The name map `BU_SAML_DEFAULT_GP_MAP` is mirrored in pra-console (`src/app/shared/helpers/pra-data-filter.ts`) and both have to change together.
  - Names of the policies the ingestion creates come from the static `groupPolicyNameFor()` of their workflows (`src/site/workflows/group-policies/`, `src/customer/workflows/`). Never rebuild such a name elsewhere. A `LIKE` pattern with a customer name may narrow a search but never decides that an object belongs to the customer: longer customer names match too, and `_` is a wildcard. Known open exception: `SupportTeamArtifactsWorkflow` (customer deletion, see `../docs/knowledge/domains/external-users.md`).
- Customer deactivation and reactivation change the login only of the users chosen by `CustomerExclusiveUsersWorkflow` (`src/customer/workflows/`): direct members of the customer's own policies whose site roles on the same instance all belong to the customer. A user whose roles cannot be read is reported and left unchanged.
- Stability invariants (release 3.2, see `../docs/knowledge/investigations/r3.2-stability/`):
  - System log and monitoring rows are written only through `LogService` and `MonitoringRecordWriterService`, which queue them in a bounded `BufferedEntityWriter`. Never insert into `pra_logs` or the monitoring tables on a request path and never wait for the database to log. Pass payloads as objects, so `LogService` redacts secrets.
  - Database access goes through the repository services and `DatabaseConnectionUtility` (bounded connection acquire, query runner released in `finally`).
  - Every call to pra-sync-api sets a timeout from `AppConfigService.praSyncApiTimeouts`. A timeout after a write means the outcome is unknown: report it, never repeat the write automatically.
  - Health: `/health/live` (process), `/health/ready` (database only), `/health` (diagnostics). pra-sync-api is a non-critical check; readiness never depends on it.
  - The manual scan status is tenant-scoped and in memory (`DiscrepancyScanStatusService`); writes go through commands, also for jobs (`EnforceRetentionCommand`).
- Tests: every behaviour change comes with a unit test next to the changed file (`*.spec.ts`). Keep the 3.1 console payload pin in `src/site/dtos/inputs/create-site.dto-input.spec.ts` green.
- Postman collection: `postman/collections/Marlink PRA API/`, `postman/exports/` and `postman/reports/` are generated by `scripts/postman/` from the registered routes and DTO metadata; never edit them by hand. After a route, guard, header or DTO change run `npm run postman:generate` and `npm run postman:check`; a new guard, interceptor, pipe or custom parameter decorator must be classified in `scripts/postman/config/components.config.ts`. New operations stay out of the customer export (Console download) until they are approved in `scripts/postman/config/customer-export.config.ts`; the folders Internal, Discrepancies, and Logs and Monitoring and the `AppController` routes are never exported. `.postman/resources.yaml` binds the generated collection to the Postman cloud collection; keep it valid and never push with `force-sync`. End-of-iteration procedure: [.github/prompts/refresh-postman-collection.prompt.md](.github/prompts/refresh-postman-collection.prompt.md).
- Container image: `Dockerfile` pins an exact Node.js release (`node:24.22.1-alpine3.24`). Node.js validates outbound TLS against the root store compiled into the Node.js binary, so the Node.js release, not the OS `ca-certificates`, decides which CAs this service trusts. Raise the pin deliberately (Node.js security releases), keep pra-api and pra-sync-api on the same release, and never return to a floating tag such as `node:lts-alpine` (SEC-01, `../docs/knowledge/operations/environments-and-delivery.md`).

## Documentation duty

Update the knowledge base after each issue (`../docs/knowledge/conventions.md`). Repository docs under `docs/` are committed together with the code change they describe.
