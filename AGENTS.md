# pra-api: instructions for AI agents

Management API of the Marlink PRA Platform (NestJS 11, TypeScript 5, CQRS, TypeORM, MariaDB). Public contract for the PRA Console and the SOC integration; delegates every BeyondTrust operation to pra-sync-api.

Last reviewed: 2026-10-07

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
  - Group policies that exist once per Business Unit are found, never created (`BuGroupPolicyLookupWorkflow`). External site users are members of `GP_<BU>_SAML_DEFAULT`; the name map `BU_SAML_DEFAULT_GP_MAP` is mirrored in pra-console (`src/app/shared/helpers/pra-data-filter.ts`) and both have to change together.
- Tests: every behaviour change comes with a unit test next to the changed file (`*.spec.ts`). Keep the 3.1 console payload pin in `src/site/dtos/inputs/create-site.dto-input.spec.ts` green.

## Documentation duty

Update the knowledge base after each issue (`../docs/knowledge/conventions.md`). Repository docs under `docs/` are committed together with the code change they describe.
