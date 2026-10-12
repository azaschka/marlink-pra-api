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

Operations behind `ApiKeyAuthGuard` (X-API-Key) and access management (`/access`) are never exported; this is checked against the effective guards, not against header rows. Every other operation is exported only when it is listed in `APPROVED_CUSTOMER_OPERATIONS`. A new operation stays in the internal collection with the status "pending decision" until it is approved there. The coverage summary lists every operation that is not exported and the reason.

## End-of-iteration procedure

Follow `../.github/prompts/refresh-postman-collection.prompt.md`. In short: `npm run postman:generate`, review the printed added, removed and updated operations and the Git diff of `reports/coverage-manifest.json`, decide the export of pending operations, `npm run postman:export:console`, `npm run postman:check`, `npm run postman:test`, optionally `npm run postman:lint`, then commit the pra-api and pra-console changes together under one issue id.

## Limits

- Examples are synthetic and validated locally against the DTO rules. They are not executed against an environment, and response examples only carry the status code (illustrative).
- Rules that only exist in handler code (for example a confirmation phrase) or in BeyondTrust are not derivable; document them in `request-overrides.ts`.
- The generator stops on inputs it cannot model: a raw body without a DTO class, `@Headers()` or `@Param()` without a name, file uploads, unclassified components, unexplained `@Req()`.
