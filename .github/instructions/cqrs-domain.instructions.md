---
description: "Use when creating or changing NestJS CQRS domain code in src/** modules. Enforces project CQRS folder structure, thin-controller approach, and handler registration patterns."
name: "CQRS Domain Patterns"
applyTo:
  - "src/**/controllers/**/*.ts"
  - "src/**/commands/**/*.ts"
  - "src/**/queries/**/*.ts"
  - "src/**/events/**/*.ts"
  - "src/**/sagas/**/*.ts"
  - "src/**/workflows/**/*.ts"
  - "src/**/repositories/**/*.ts"
  - "src/**/pipes/**/*.ts"
---

# CQRS Domain Implementation Patterns

- Keep per-module domain layout consistent with existing modules:
  - controllers, commands/handlers, queries/handlers, events, dtos, models, repositories, pipes, and optional sagas/workflows.
- Preserve strict CQRS boundaries:
  - commands mutate state,
  - queries read state,
  - controllers orchestrate only.
- Keep controllers thin:
  - validate DTO input,
  - extract headers via existing decorators,
  - delegate to CommandBus/QueryBus.
- Register new handlers via module-level CommandHandlers/QueryHandlers arrays and include them in providers.
- Reuse existing interceptors/pipes/services from nearby modules before adding new abstractions.
- Keep naming and structure aligned with the module creation guide.

# Minimum Change Checklist

- New command/query/event classes are in correct folders.
- Corresponding handlers are wired in providers.
- DTO and route naming follows existing Create/Retrieve/Modify/Delete conventions.
- Changes pass npm run lint.
- If module wiring changed, run npm run build.
