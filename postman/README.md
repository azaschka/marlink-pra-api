# PRA API Postman collection

The PRA API collection is generated from the pra-api source code. Do not edit the generated files by hand: change the code or the generator configuration and regenerate.

## What is here

| Path | Content | Generated |
|---|---|---|
| `collections/Marlink PRA API/` | Native Postman collection (v3, one YAML file per request) with every registered route, including the routes hidden from Swagger. For Postman's local, Git-backed workspace and the `postman collection` CLI commands. | yes |
| `exports/marlink-pra-api-internal.postman_collection.json` | The same complete collection as an importable Collection v2.1 file (internal use). | yes |
| `exports/marlink-pra-api-customer.postman_collection.json` | Customer export, copied byte for byte into the PRA Console download (`pra-console/src/assets/docs/Marlink PRA API.postman_collection.json`). | yes |
| `exports/marlink-pra-api.postman_environment.json` | Sanitised environment template: every value empty except the default `baseUrl`. | yes |
| `reports/coverage-manifest.json`, `reports/coverage-summary.md` | Coverage of the registered routes, export decisions, contract notes. | yes |
| `collections/BeyondTrust Privileged Remote Access Configuration APIs/` | BeyondTrust reference collection. | no, maintained separately and never touched by the generator |

Generator, configuration and tests: `../scripts/postman/`.

## Commands

| Command | Purpose |
|---|---|
| `npm run postman:generate` | Regenerate the collection, the exports and the reports. Everything is rendered and validated in memory first; nothing is written when a check fails. Unchanged files are not rewritten. |
| `npm run postman:check` | Non-writing check. Fails on drift between code and the checked-in files, on missing or duplicate routes, orphan requests, wrong optional flags, unresolved variables, invalid bodies, unexplained export exclusions and a Console asset that differs from the customer export. |
| `npm run postman:export:console` | Copy the customer export into the PRA Console (`../pra-console` by default, `-- --console-dir <path>` otherwise) and verify the download references. |
| `npm run postman:lint` | Optional. Runs the official Postman CLI (`postman collection lint`, downloaded through `npm exec`) on the native collection and on both exports after `postman collection migrate`. Needs network access to the npm registry. |
| `npm run postman:cloud:login` | Once per machine: store a Postman API key for the Postman CLI (interactive). |
| `npm run postman:cloud:diff` | Read-only preview of what a push changes in the bound Postman cloud workspace. |
| `npm run postman:cloud:push` | Update the cloud collection from the checked-in files (`postman workspace push --push-strategy default`). Refuses to run when the checked-in files are not up to date; `-- --yes` skips the confirmation. |
| `npm run postman:test` | Unit tests of the generator. |
| `npm run postman:typecheck` | Type check of the generator. |

`-- --release-version x.y.z` overrides the version taken from `package.json`, for example to prepare a release collection before the version bump.

## One-time setup in Postman

1. Import `exports/marlink-pra-api-internal.postman_collection.json` (or the customer export), optionally with `exports/marlink-pra-api.postman_environment.json`.
2. Set `baseUrl`, `accessKey` and `tenantId` (plus `apiKey` and `jwtToken` for internal operations) in a local environment or in the Postman Vault. Collection variables stay empty and must never hold credentials.
3. Set resource id variables such as `customerId` or `siteId` only when you need them; they are empty on purpose.

`baseUrl` is the scheme, host and optional path prefix in front of the controller paths. The API has no global prefix and no URI versioning (`src/main.ts`): call the API host directly without `/api`, or the PRA Console host with `/api` (the Console forwards `/api` to the API, which is why the OpenAPI document declares the server `/api`). `X-Tenant-Id` is the BeyondTrust instance id, never a customer id; it is never defaulted.

## How the generator works

1. It loads the `AppModule` graph under ts-node without creating a Nest application: no dependency injection, no database connection, no migrations, no scheduled jobs, no calls to pra-sync-api.
2. It walks the module imports in Nest's registration order and reads the route metadata Nest itself uses: controller and handler paths (including route arrays and inherited handlers), request methods, guards, interceptors, pipes, route arguments and custom parameter decorators.
3. Request DTOs are described from the class-validator, class-transformer and Swagger metadata, so inherited and mapped DTOs (`PartialType`) show their effective rules. A syntax scan of `src/` adds facts that metadata cannot see: properties without decorators, handlers with two HTTP method decorators, global prefix and versioning calls in `src/main.ts`.
4. Each route becomes one canonical request: path, query and header inputs with type, required flag, default, enum and rules; required inputs enabled, optional ones disabled; the minimal valid body in the request and every writable field in the saved example "Full body". Both bodies run through the route's own `ValidationPipe` and `NonEmptyBodyPipe` before anything is written.
5. Every guard, interceptor, pipe and custom parameter decorator must be classified in `config/components.config.ts`. A new one stops the run until it is documented, because it may read a new credential or header.

Configuration (`../scripts/postman/config/`):

| File | Holds |
|---|---|
| `collection.config.ts` | Names, output paths, domain folders, path variable names, explanations for `@Req()` and `@Res()` handlers, the Console asset and its references. |
| `components.config.ts` | Authentication scheme and request inputs of each guard, interceptor, pipe and custom parameter decorator. |
| `customer-export.config.ts` | Customer export policy and the list of approved operations. |
| `request-overrides.ts` | Per-operation examples and notes, field-level example values (`<DtoClass>.<property>`). Validated like generated examples. |

## Customer export policy

Never exported (`scripts/postman/config/customer-export.config.ts`):

- operations behind `ApiKeyAuthGuard` (X-API-Key) and access management (`/access`), checked against the effective guards, not against header rows,
- the folders Internal, Discrepancies, and Logs and Monitoring, and the `AppController` routes (`GET /`, `GET /ping`) (decision of 2026-10-12).

Every other operation is exported only when it is listed in `APPROVED_CUSTOMER_OPERATIONS`. A new operation stays in the internal collection with the status "pending decision" until it is approved there; approving an operation that a rule excludes stops the generator. The coverage summary lists every operation that is not exported and the reason.

## Postman cloud workspace

The checked-in files are the source of truth. `.postman/resources.yaml` (Postman Native Git) binds `postman/collections/Marlink PRA API/` to the cloud collection `11321463-ed8ef1d3-324b-4b3e-810a-e2e0070732e6` in the workspace "Marlink PRA"; the generator uses that collection's id and fails when the binding is missing, damaged or points to files that no longer exist.

To update the cloud copy after a regeneration: `npm run postman:cloud:login` once, then `npm run postman:cloud:diff` and `npm run postman:cloud:push`. The push updates the bound collection in place and replaces its content with the checked-in files; edits made only in the cloud are overwritten. The same push also updates the BeyondTrust reference collection, which is bound in the same file; check the diff first. Never push with `--push-strategy force-sync`: it deletes every cloud element without a local counterpart, including other collections and specifications of the workspace.

## End-of-iteration procedure

Refresh the collection at the end of an iteration. Do not edit generated files by hand.

1. Inventory `git status` of pra-api and pra-console. Do not touch changes that are not part of this task.
2. Run `npm ci` when dependencies changed, then `npm run postman:generate` (add `-- --release-version x.y.z` only when the release version differs from `package.json`).
3. When the run stops, fix the cause instead of loosening a check:

| Finding | Fix |
|---|---|
| `UNCLASSIFIED_COMPONENT`, `UNCLASSIFIED_PARAM_DECORATOR` | Classify the new guard, interceptor, pipe or decorator in `scripts/postman/config/components.config.ts` after reading its code: which credential or header it reads, required or optional. |
| `UNEXPLAINED_REQUEST_OBJECT`, `UNDOCUMENTED_RESPONSE_OBJECT` | Explain the handler in `collection.config.ts`. |
| `INVALID_BODY_EXAMPLE`, `INVALID_QUERY_EXAMPLE` | Add a synthetic value in `request-overrides.ts` (`FIELD_EXAMPLES` first, a full body override only when needed). |
| `ORPHAN_*` | Remove the configuration entries of routes that no longer exist. |
| `URL_COMPOSITION_CHANGED`, `QUERY_PARSER_CHANGED` | Review `src/main.ts` with the team before adapting the configuration. |
| `WORKSPACE_BINDING_*` | Repair `.postman/resources.yaml` so that the native collection directory stays bound to its cloud collection. |
| `CONFLICTING_EXPORT_DECISION` | An approved operation is excluded by a rule; remove the approval. |
| `CONTROLLER_WITHOUT_DOMAIN` (warning) | Add the controller to a domain folder. |

4. Review the printed added, removed and updated operations and the Git diff of `reports/coverage-manifest.json`. Read the new "Contract notes" in `reports/coverage-summary.md` and report new unauthenticated routes, unenforced validation and Swagger differences. Do not change runtime behaviour to make the documentation easier.
5. Customer export: list the operations with status `pending-decision` and get a decision for each. Add approved keys to `APPROVED_CUSTOMER_OPERATIONS` (or a reason to `EXCLUDED_CUSTOMER_OPERATIONS`) and regenerate. Never approve an operation behind X-API-Key, under `/access`, in the folders Internal, Discrepancies, and Logs and Monitoring, or of `AppController`.
6. `npm run postman:export:console` (pra-console checked out next to pra-api, or `-- --console-dir <path>`).
7. Verify: `npm run postman:check`, `npm run postman:test`, `npm run postman:typecheck`, `npx eslint scripts/postman`, and `npm run postman:lint` when the npm registry is reachable. A second `npm run postman:generate` must report zero written files.
8. Postman cloud copy (standing approval, 2026-10-12): after the generated files are reviewed and committed, run `npm run postman:cloud:diff`, then `npm run postman:cloud:push`. This needs a Postman API key (`npm run postman:cloud:login`); a session without one asks the user to run the two commands. Use only the default push strategy, never `force-sync`. If the push reports changed generated files, show them instead of committing them.
9. Update the knowledge base: [operations/postman-collection](../../docs/knowledge/operations/postman-collection.md) and the changelog, and record questions and answers in the implementation log ([conventions](../../docs/knowledge/conventions.md)).
10. Commit only when asked and with an issue id: one commit in pra-api (generated files, configuration) and one in pra-console (download asset), same id. Never push to git; the Postman cloud collection is updated only through step 8.

Report at the end of the iteration: version and counts (routes, operations, customer export included, excluded, pending), added, removed and updated operations, new contract notes and open export decisions, and the commands run with their results. State that examples were validated locally, not executed against an environment.

## Limits

- Examples are synthetic and validated locally against the DTO rules. They are not executed against an environment, and response examples only carry the status code (illustrative).
- Rules that only exist in handler code (for example a confirmation phrase) or in BeyondTrust are not derivable; document them in `request-overrides.ts`.
- The generator stops on inputs it cannot model: a raw body without a DTO class, `@Headers()` or `@Param()` without a name, file uploads, unclassified components, unexplained `@Req()`.
