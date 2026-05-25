---
description: "Implement or review a PRA API contract change with DTO/controller/handler updates and explicit cross-repo coordination for PRA Console and PRA Sync API."
name: "API Contract Change"
argument-hint: "Describe endpoint(s), header/DTO/error-shape changes, compatibility expectation, and impacted repos"
agent: "agent"
---

Implement the requested API contract change in this repository.

Input:
- {{input:API Contract Change Request}}

Execution requirements:
- Preserve CQRS/module conventions from [CQRS Domain Patterns](../instructions/cqrs-domain.instructions.md).
- Apply tenant/scope guarantees from [Tenant and Scope Safety Rules](../instructions/tenant-safety.instructions.md).
- Respect architecture boundaries from [PRA System Boundaries](../instructions/system-boundaries.instructions.md).
- Keep controllers thin and enforce contract behavior in DTO validation, handlers, and repository/integration boundaries.
- Evaluate compatibility and document whether the change is backward compatible or breaking.
- Apply [Cross-Repo Contract Checklist](../CROSS_REPO_CONTRACT_CHECKLIST.md) and identify required follow-up work in PRA Console and/or PRA Sync API.

Required output format:
1. Files changed and one-line purpose each.
2. Contract deltas (headers, request/response DTOs, error/status behavior).
3. CQRS/tenant/boundary checks applied.
4. Validation steps and command outcomes.
5. Coupled-change follow-ups by repository.
