import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { HealthCheckEntry } from '../../observability/models/health-check-entry.model';
import { DatabaseConnectionUtility } from '../../shared/utilities/database-connection.utility';
import { CachedCheck } from './cached-check';

/**
 * Database check for readiness and diagnostics: at most one SELECT 1 per 5 s per process, bounded by 2 s for the
 * pooled connection and 2 s for the query. Under pool exhaustion it fails fast instead of queuing behind business
 * requests, and a connection that arrives late is released (DatabaseConnectionUtility.acquireQueryRunner).
 */
@Injectable()
export class DatabaseHealthCheck {
    public static readonly ACQUIRE_TIMEOUT_IN_MS = 2000;
    public static readonly QUERY_TIMEOUT_IN_MS = 2000;
    private static readonly CACHE_TTL_IN_MS = 5000;

    private readonly cached = new CachedCheck<HealthCheckEntry>(DatabaseHealthCheck.CACHE_TTL_IN_MS, () => this.run());

    constructor(private readonly dataSource: DataSource) {}

    public check(): Promise<HealthCheckEntry> {
        return this.cached.get();
    }

    private async run(): Promise<HealthCheckEntry> {
        const startedAt = Date.now();
        let queryRunner: QueryRunner | undefined;

        try {
            queryRunner = await DatabaseConnectionUtility.acquireQueryRunner(
                this.dataSource,
                DatabaseHealthCheck.ACQUIRE_TIMEOUT_IN_MS,
            );
        } catch {
            return DatabaseHealthCheck.down(
                `No database connection within ${DatabaseHealthCheck.ACQUIRE_TIMEOUT_IN_MS} ms`,
            );
        }

        let timer: NodeJS.Timeout | undefined;
        let timedOut = false;

        try {
            await Promise.race([
                queryRunner.query('SELECT 1'),
                new Promise<never>((_, reject) => {
                    timer = setTimeout(() => {
                        timedOut = true;
                        reject(new Error('timeout'));
                    }, DatabaseHealthCheck.QUERY_TIMEOUT_IN_MS);
                }),
            ]);

            return {
                status: 'up',
                critical: true,
                latencyMs: Date.now() - startedAt,
                checkedAt: new Date().toISOString(),
            };
        } catch {
            return DatabaseHealthCheck.down(
                timedOut
                    ? `No answer to SELECT 1 within ${DatabaseHealthCheck.QUERY_TIMEOUT_IN_MS} ms`
                    : 'SELECT 1 failed',
            );
        } finally {
            clearTimeout(timer);

            if (timedOut) {
                // A connection with a hanging query must not go back to the pool.
                (
                    queryRunner as unknown as { databaseConnection?: { destroy?: () => void } }
                ).databaseConnection?.destroy?.();
            }

            await queryRunner.release().catch(() => undefined);
        }
    }

    private static down(message: string): HealthCheckEntry {
        return { status: 'down', critical: true, message, checkedAt: new Date().toISOString() };
    }
}
