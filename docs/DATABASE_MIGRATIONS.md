# Automatic Database Index Migration

## Overview

The PRA API now includes an **automatic migration system** that creates database indexes on application startup based on TypeORM entity metadata. This ensures optimal query performance in production environments where `synchronize: false`.

## How It Works

### Automatic Execution

1. **On Deployment**: Migrations run automatically when the application starts
2. **Production Only**: Skipped in development mode (where `synchronize: true` handles schema)
3. **Idempotent**: Safe to run multiple times - only creates missing indexes

### What Gets Indexed

The migration system automatically creates indexes for:

1. **Explicit `@Index()` decorators** on entities
2. **Unique columns** (`@Column({ unique: true })`)
3. **Foreign key relationships** (automatically detected from relations)
4. **Primary keys** (handled by TypeORM automatically)

### Example Entity

```typescript
@Entity({ name: 'pra_customers' })
export class CustomerEntity {
    @PrimaryGeneratedColumn() // ✅ Primary key index (automatic)
    public id!: number;

    @Column({ unique: true }) // ✅ Creates UQ_pra_customers_key index
    public key!: string;

    @Column({ unique: true }) // ✅ Creates UQ_pra_customers_name index
    public name!: string;

    @Column() // ✅ Creates IDX_pra_customers_business_unit index (if foreign key)
    public businessUnit!: string;
}
```

## Log Output

### Successful Migration

```
[MigrationService] Starting database migrations...
[MigrationService] ✅ Created index UQ_pra_customers_key on pra_customers
[MigrationService] ✅ Created index UQ_pra_customers_name on pra_customers
[MigrationService] ✅ Created index UQ_pra_access_key on pra_access
[MigrationService] Index creation summary: 3 created, 12 already existed
[MigrationService] Updating table statistics for query optimizer...
[MigrationService] ✅ Database migrations completed successfully
```

### Development Mode

```
[MigrationService] Development mode detected - skipping migrations (synchronize enabled)
```

## Performance Impact

### Before Migration

```
Query: SELECT * FROM pra_customers WHERE id = 1
Execution time: 938034ms (15+ minutes) 🔴
```

### After Migration

```
Query: SELECT * FROM pra_customers WHERE id = 1
Execution time: < 10ms ✅
```

## Architecture

### Files Created

- `src/migration/migration.module.ts` - NestJS module with OnModuleInit hook
- `src/migration/services/migration.service.ts` - Migration logic and index creation
- `src/app.module.ts` - Registers MigrationModule early in import chain

### Key Features

1. **Type-Safe**: Uses TypeORM metadata API
2. **Non-Blocking**: Migrations run during app startup, before serving requests
3. **Logging**: Comprehensive logs with transaction tracking
4. **Error Handling**: Graceful failures - warns on errors but doesn't crash app
5. **Statistics Update**: Runs `ANALYZE TABLE` after creating indexes

## Configuration

### Environment Variables

No additional configuration needed! The system uses existing TypeORM configuration:

```env
NODE_ENV=production  # Triggers migration system
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=pra
```

## Manual Index Management

### Check Existing Indexes

```sql
SHOW INDEX FROM pra_customers;
SHOW INDEX FROM pra_access;
```

### Verify Index Usage

```sql
EXPLAIN SELECT * FROM pra_customers WHERE id = 1;
-- Should show: key: PRIMARY, type: const
```

### Drop Index (if needed)

```sql
DROP INDEX UQ_pra_customers_key ON pra_customers;
-- Migration will recreate it on next deployment
```

## Troubleshooting

### Issue: Migrations not running

**Symptoms**: No migration logs on startup
**Solution**: Check `NODE_ENV=production` is set

### Issue: "Index already exists" error

**Symptoms**: Migration fails with duplicate index error
**Solution**: Safe to ignore - system will skip and continue

### Issue: Slow queries persist

**Solutions**:

1. Check if indexes were created: `SHOW INDEX FROM table_name`
2. Verify index is being used: `EXPLAIN SELECT ...`
3. Run `ANALYZE TABLE` manually to update statistics
4. Check MySQL slow query log configuration

### Issue: Migration fails on startup

**Impact**: App continues to run (non-blocking)
**Solution**: Check logs for specific error, manually create problematic index

## Adding New Indexes

### Method 1: Entity Decorators (Recommended)

```typescript
@Entity({ name: 'pra_example' })
@Index(['columnA', 'columnB']) // Composite index
export class ExampleEntity {
    @Column({ unique: true }) // Automatic unique index
    public email!: string;

    @Column()
    @Index() // Single column index
    public status!: string;
}
```

### Method 2: Manual SQL (for complex indexes)

```sql
CREATE INDEX IDX_custom_name ON pra_table (column1, column2);
```

## Monitoring

### Check Migration Status

```typescript
// Logs appear in application startup output
[MigrationService] Index creation summary: X created, Y already existed
```

### Database Metrics

```sql
-- Check index usage statistics
SELECT * FROM sys.schema_index_statistics
WHERE table_name = 'pra_customers';

-- Check table statistics age
SELECT UPDATE_TIME FROM information_schema.tables
WHERE table_name = 'pra_customers';
```

## Best Practices

1. **Always add indexes for**:
    - WHERE clause columns
    - JOIN columns
    - Foreign keys
    - Frequently sorted columns (ORDER BY)

2. **Avoid over-indexing**:
    - Every index slows down INSERT/UPDATE/DELETE
    - Don't index columns rarely used in queries
    - Don't create duplicate indexes

3. **Monitor slow queries**:
    - Enable MySQL slow query log
    - Set `long_query_time = 1` to log queries > 1 second
    - Review logs regularly

## Pre-startup scripts relevant for operations

`src/migration/scripts/align-pra-logs-and-add-retention-indexes.migration.ts` (run by `src/migration/run-migrations-before-startup.ts`) widens `pra_logs.action_name` to `varchar(1000)` with `MODIFY` (values kept) and creates `IDX_pra_logs_creation_date` and `IDX_pra_monitorings_creation_date` online if missing. The index build takes time proportional to the table size and delays the startup. On large tables create the indexes beforehand in a quiet period:

```sql
CREATE INDEX IDX_pra_logs_creation_date ON pra_logs (creation_date) ALGORITHM=INPLACE LOCK=NONE;
CREATE INDEX IDX_pra_monitorings_creation_date ON pra_monitorings (creation_date) ALGORITHM=INPLACE LOCK=NONE;
```

Failures are logged and do not stop the startup; check the startup log after each deployment. Deploy pra-api before pra-sync-api when the table still has the old `varchar(255)` column: the Sync API's schema synchronisation would otherwise replace the column once and lose its values.

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Verify database credentials in `.env`
- [ ] Check application starts successfully
- [ ] Review migration logs in startup output
- [ ] Run test queries to verify performance
- [ ] Monitor application logs for slow query warnings

## Rollback

If migrations cause issues:

1. **Disable migrations temporarily**:

    ```typescript
    // src/migration/migration.service.ts
    public async runMigrations(): Promise<void> {
        this.logger.log('Migrations disabled for troubleshooting');
        return; // Skip all migrations
    }
    ```

2. **Drop specific indexes**:

    ```sql
    DROP INDEX UQ_pra_customers_key ON pra_customers;
    ```

3. **Redeploy** with fixes

## Future Enhancements

Potential improvements:

- Migration version tracking (prevent re-running old migrations)
- Downgrade/rollback support
- Migration dry-run mode
- Custom migration scripts support
- Performance metrics collection
