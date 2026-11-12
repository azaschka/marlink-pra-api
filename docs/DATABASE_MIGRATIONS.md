# Database Migrations and Indexes

How pra-api changes and protects its database schema. Rules in short: [AGENTS.md](../AGENTS.md).

## Overview

pra-api and pra-sync-api use the same MariaDB server. pra-sync-api owns the shared base schema and is the authoritative writer of the shared domain tables. pra-api changes the schema through three mechanisms, in this order at startup:

| Mechanism | Where | When it runs |
|---|---|---|
| Pre-startup scripts | `src/migration/scripts/`, registered in `src/migration/run-migrations-before-startup.ts` | Always, before Nest and TypeORM start (`main.ts`) |
| TypeORM `synchronize` | Entity classes | Whenever `ENV` is not `production` or `prod` |
| Index creation | `MigrationService` (`src/migration/services/migration.service.ts`) | On module init, production only |

There is no migration version table. Every script must therefore be idempotent and re-runnable.

## Changing the schema

1. Prefer to add a field natively in pra-sync-api and proxy it. A local-only column in pra-api needs a reason (example: `beyondtrust_instances.cname`, which is stored only in pra-api).
2. Write a hand-written script under `src/migration/scripts/`: check the current state (table, column, index exists) and change only what is missing. One query runner per table or statement group; do not reuse a runner that an earlier step released.
3. Register the script in `runMigrationsBeforeStartup()`. A failure is logged and the startup continues, so the application must tolerate the old schema until the script succeeds; check the startup log after each deployment.
4. Add a spec next to the script. `*.mariadb.spec.ts` suites run only when `PRA_TEST_MARIADB_HOST` is set.
5. Coupled change with pra-sync-api (shared tables): state the deployment order in the commit and the knowledge base, see [cross-repository contracts](../../docs/knowledge/cross-repo-contracts.md).
6. In production `synchronize` is off, so the script is the only way the schema changes; test it against a database that does not run `synchronize`.

Existing scripts:

| Script | Purpose |
|---|---|
| `rename-site-administrators-to-auditors.migration.ts` | Renames `pra_site_administrators` to `pra_site_auditors` |
| `move-customer-bu-to-bt-instance-bu.migration.ts` | Moves the business unit from the customer to the BeyondTrust instance |
| `add-cname-to-beyondtrust-instances.migration.ts` | Adds `beyondtrust_instances.cname` (HTTPS URL shown in activation and new-password emails; not forwarded to pra-sync-api) |
| `add-default-site-user-source-type.ts` | Adds `sourceType` (default `internal`) to the three site user tables |
| `align-pra-logs-and-add-retention-indexes.migration.ts` | STAB-08: widens `pra_logs.action_name` to `varchar(1000)` and creates the `creation_date` indexes for the retention |

## Automatic index creation (production)

`MigrationService` reads the TypeORM entity metadata and creates the indexes that are missing:

1. Indexes declared with `@Index()` (named `IDX_<table>_<columns>` unless named explicitly)
2. Unique columns (`UQ_<table>_<column>`)
3. Foreign key columns (`IDX_<table>_<columns>`)

Primary keys are handled by TypeORM. Existing indexes are detected by name and skipped, so the service can run on every start. A failure on one index is logged as a warning and the next index is processed. After new indexes were created it runs `ANALYZE TABLE` for the tables. Outside production it logs that it is skipped, because `synchronize` handles the schema.

Log lines to look for:

```
[MigrationService] Starting database migrations...
[MigrationService] Index creation summary: 3 created, 12 already existed
[MigrationService] Updating table statistics for query optimizer...
```

To add an index, declare it on the entity:

```typescript
@Entity({ name: 'pra_example' })
@Index(['columnA', 'columnB']) // composite index
export class ExampleEntity {
    @Column({ unique: true }) // unique index
    public email!: string;

    @Column()
    @Index() // single column index
    public status!: string;
}
```

Use a pre-startup script for an index that the metadata cannot express or that needs `ALGORITHM=INPLACE, LOCK=NONE`.

Guidelines: index WHERE, JOIN and ORDER BY columns and foreign keys; avoid duplicate indexes and indexes on columns that are rarely queried; every index slows down writes.

## Operations

### Retention indexes (STAB-08)

`align-pra-logs-and-add-retention-indexes.migration.ts` widens `pra_logs.action_name` with `MODIFY` (values kept) and creates `IDX_pra_logs_creation_date` and `IDX_pra_monitorings_creation_date` online if missing. The index build takes time proportional to the table size and delays the startup. On large tables create the indexes beforehand in a quiet period:

```sql
CREATE INDEX IDX_pra_logs_creation_date ON pra_logs (creation_date) ALGORITHM=INPLACE LOCK=NONE;
CREATE INDEX IDX_pra_monitorings_creation_date ON pra_monitorings (creation_date) ALGORITHM=INPLACE LOCK=NONE;
```

Deploy pra-api before pra-sync-api when the table still has the old `varchar(255)` column: the schema synchronisation of pra-sync-api would otherwise replace the column once and lose its values.

### Checks

```sql
SHOW INDEX FROM pra_customers;
EXPLAIN SELECT * FROM pra_customers WHERE id = 1;   -- expect key: PRIMARY
```

Run `ANALYZE TABLE <table>` manually when statistics are stale. For slow queries enable the MariaDB slow query log (`long_query_time = 1`).

### Troubleshooting

| Symptom | Cause and action |
|---|---|
| No migration log lines | `ENV` is not `production` or `prod` (index creation is skipped), or the pre-startup log lines are missing: check the start of the pod log. |
| "Failed to create index" warning | Usually a duplicate with a different name or a duplicate key in the data; create the index manually after checking the data. |
| Pre-startup script failed | Logged as `Pre-startup migrations failed`; the application still starts. Fix the cause and restart; scripts re-run safely. |
| Slow queries persist | Check that the index exists and is used (`EXPLAIN`), then refresh statistics. |

### Deployment checklist

- [ ] `ENV=production` is set (otherwise `synchronize` is active and the index service is skipped)
- [ ] Database credentials are present in the Kubernetes secret
- [ ] Startup log reviewed: pre-startup migrations completed, index summary printed, no warnings
- [ ] Coupled schema change: pra-sync-api deployed in the documented order
- [ ] Test queries on the affected tables return as expected

### Rollback

Scripts have no down step. To roll back, ship a corrective script (again idempotent) or restore the previous image; an added column or index stays in place and is harmless for the old version. Drop an index with `DROP INDEX <name> ON <table>`; it is recreated at the next production start if the entity still declares it, so remove the declaration first.
