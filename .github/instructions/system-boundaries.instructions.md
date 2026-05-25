---
description: "Use when changing architecture-relevant API code, contracts, or integrations in PRA API. Defines cross-repo boundaries with PRA Console and PRA Sync API."
name: "PRA System Boundaries"
applyTo:
  - "src/**/*.ts"
  - "docs/**/*.md"
---

# PRA API System Boundaries

- PRA API is the orchestration and management boundary between frontend and sync backend.
- Upstream caller: PRA Console.
- Downstream integration backend: PRA Sync API.
- Do not move direct BeyondTrust integration responsibilities into PRA API if they belong in PRA Sync API adapters.
- Do not move frontend concerns (UI shaping, view state rules) into backend contracts unless explicitly required by API design.

# Cross-Repo Contract Discipline

- If endpoint payloads, required headers, auth behavior, or error shapes change:
  - update corresponding DTO/docs in this repo,
  - call out required follow-up in PRA Console and/or PRA Sync API.
- Keep tenant, access-key, and transaction-id flows explicit across controller -> handler -> downstream calls.
- Prefer backward-compatible contract changes; if breaking changes are required, document migration impact.
