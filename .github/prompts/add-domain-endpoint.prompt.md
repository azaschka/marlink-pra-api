---
description: "Add a new domain endpoint end-to-end in this NestJS CQRS repository, including DTOs, handlers, module wiring, scope safety, and tests."
name: "Add Domain Endpoint"
argument-hint: "Describe module, endpoint intent, input/output DTOs, headers, and expected behavior"
agent: "agent"
---

Implement the requested endpoint end-to-end in this repository.

Input:
- {{input:Endpoint Request}}

Execution requirements:
- Follow CQRS implementation and module structure from [CQRS Domain Patterns](../instructions/cqrs-domain.instructions.md).
- Apply tenant and access protections from [Tenant and Scope Safety Rules](../instructions/tenant-safety.instructions.md).
- Keep controllers thin and move behavior into command/query handlers and services.
- Add or update DTOs, commands/queries, handlers, controller routes, repository/service logic, and module provider wiring.
- Reuse existing decorators, guards, interceptors, and request pipes from neighboring modules.
- Maintain naming and folder conventions documented in [docs/guides/ADDING_NEW_MODULE.md](../../docs/guides/ADDING_NEW_MODULE.md).

Required output format:
1. Files changed and one-line purpose each.
2. Why CQRS split is correct for this endpoint.
3. Scope and tenant safety checks applied.
4. Tests added or updated and what they validate.
5. Commands run and outcomes.
