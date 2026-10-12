---
description: "End-of-iteration refresh of the PRA API Postman collection: regenerate from code, review coverage and export decisions, sync the PRA Console download, verify."
name: "Refresh Postman Collection"
argument-hint: "Issue id for the commit (optional), release version override (optional), customer export decisions already taken (optional)"
agent: "agent"
---

Refresh the PRA API Postman collection for the current iteration with the generator in `scripts/postman/`. Do not edit generated files by hand. Background and policies: [postman/README.md](../../postman/README.md).

Input:
- {{input:Issue id, release version override, export decisions}}

Steps:
1. Inventory `git status` of pra-api and pra-console. Do not touch changes that are not part of this task.
2. `npm ci` when dependencies changed, then `npm run postman:generate` (add `-- --release-version x.y.z` only when the release version differs from `package.json`).
3. When the run stops, fix the cause instead of loosening a check:
   - `UNCLASSIFIED_COMPONENT` or `UNCLASSIFIED_PARAM_DECORATOR`: classify the new guard, interceptor, pipe or decorator in `scripts/postman/config/components.config.ts` after reading its code (which credential or header it reads, required or optional).
   - `UNEXPLAINED_REQUEST_OBJECT`, `UNDOCUMENTED_RESPONSE_OBJECT`: explain the handler in `collection.config.ts`.
   - `INVALID_BODY_EXAMPLE`, `INVALID_QUERY_EXAMPLE`: add a synthetic value in `request-overrides.ts` (`FIELD_EXAMPLES` first, a full body override only when needed).
   - `ORPHAN_*`: remove configuration entries of routes that no longer exist.
   - `URL_COMPOSITION_CHANGED`, `QUERY_PARSER_CHANGED`: review `src/main.ts` with the user before adapting the configuration.
   - `CONTROLLER_WITHOUT_DOMAIN` (warning): add the controller to a domain folder.
4. Review the printed added, removed and updated operations and the Git diff of `postman/reports/coverage-manifest.json`. Read the new "Contract notes" in `postman/reports/coverage-summary.md`; report new unauthenticated routes, unenforced validation and Swagger differences to the user. Do not change runtime behaviour to make the documentation easier.
5. Customer export: list the operations with status `pending-decision` and ask the user which to approve. Add approved keys to `APPROVED_CUSTOMER_OPERATIONS` (or a reason to `EXCLUDED_CUSTOMER_OPERATIONS`) and regenerate. Never approve an operation behind X-API-Key or under `/access`.
6. `npm run postman:export:console` (pra-console checked out next to pra-api, or `-- --console-dir <path>`).
7. Verify: `npm run postman:check`, `npm run postman:test`, `npm run postman:typecheck`, `npx eslint scripts/postman`, and `npm run postman:lint` when the npm registry is reachable. Run a second `npm run postman:generate`: it must report zero written files.
8. Update the knowledge base (`../docs/knowledge/operations/postman-collection.md`, changelog) and record questions and answers in the implementation log.
9. Commit only when asked and with an issue id: one commit in pra-api (generated files, configuration) and one in pra-console (download asset), same id. Never push, never write to a Postman cloud workspace without explicit approval.

Required output:
1. Version and counts (routes, operations, customer export included, excluded, pending).
2. Added, removed and updated operations.
3. New contract notes and open export decisions.
4. Commands run and their results; state that examples were validated locally, not executed against an environment.
