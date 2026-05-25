---
description: "Use when editing tenant-aware controllers, commands, queries, pipes, or repositories. Enforces X-Tenant-Id propagation, access/scope checks, and prevention of cross-tenant data access."
name: "Tenant and Scope Safety Rules"
applyTo:
  - "src/**/controllers/**/*.ts"
  - "src/**/commands/**/*.ts"
  - "src/**/queries/**/*.ts"
  - "src/**/pipes/**/*.ts"
  - "src/**/repositories/**/*.ts"
---

# Tenant and Scope Safety Checks

- Treat X-Tenant-Id as required for tenant-aware endpoints.
- In controllers, use existing decorators (ApiTenantIdHeader and TenantIdHeader) instead of manual header parsing.
- Propagate tenantId and transactionId through controller -> command/query -> service/repository calls.
- Keep AccessGuard and existing scope interceptors/pipes in place for protected modules; do not bypass them.
- Ensure repository and external API query/filter inputs remain explicitly scoped (business units, customers, jump groups, tenantId).
- Do not introduce default-tenant fallbacks or silent scope expansion.

# Self-Review Prompts

- Can this change read or write resources outside caller scope?
- Is tenantId present on every path where tenant-aware data is accessed?
- Are logs and errors still correlation-friendly (transactionId) without leaking tenant-external details?
- If event/saga/workflow behavior changed, is scope propagation explicit and bounded?

# Verification

- Run npm run lint.
- Run npm test (or focused tests for affected tenant/scope logic).
- If repository filters changed, add or update at least one assertion for scope or tenant isolation.
