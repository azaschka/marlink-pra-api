import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { HealthCheckEntry } from '../../observability/models/health-check-entry.model';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { BatchedDeleteOptions, BatchedDeleteUtility } from '../../shared/utilities/batched-delete.utility';
import { tryNamedLock } from './named-lock';

export type RetentionTable = 'pra_logs' | 'pra_monitorings';

export interface RetentionRunReport {
    readonly table: RetentionTable;
    readonly status: 'completed' | 'incomplete' | 'skipped' | 'failed';
    readonly retentionDays: number;
    readonly finishedAt: string;
    readonly deleted?: number;
    readonly batches?: number;
    readonly durationMs?: number;
    readonly oldestRemainingAgeDays?: number | null;
    /** Rows older than the retention plus the tolerance remain (backlog). */
    readonly backlog?: boolean;
    readonly reason?: string;
}

/**
 * Enforces "no row older than the retention period plus at most 2 hours" for the system log and the monitoring
 * records. Runs hourly (CRON_JOB_LOG_RETENTION), deletes in batches of 5,000 rows with a pause, at most 10 minutes
 * per table and run, resumes by criterion, and never runs twice at the same time (in process and across replicas
 * via GET_LOCK). Every run writes one summary line; a backlog is a warning line and makes the non-critical
 * diagnostic check "retention" a warning.
 */
@Injectable()
export class RetentionService {
    public static readonly SCHEDULED_DELETE: BatchedDeleteOptions = {
        batchSize: 5000,
        pauseInMs: 100,
        maxDurationInMs: 10 * 60 * 1000,
    };
    private static readonly BACKLOG_TOLERANCE_IN_MS = 2 * 60 * 60 * 1000;
    private static readonly DAY_IN_MS = 24 * 60 * 60 * 1000;
    private static readonly TABLES: readonly RetentionTable[] = ['pra_logs', 'pra_monitorings'];

    private readonly logger = new Logger('Retention');
    private readonly running = new Set<RetentionTable>();
    private readonly lastRuns = new Map<RetentionTable, RetentionRunReport>();

    constructor(
        private readonly dataSource: DataSource,
        private readonly appConfigService: AppConfigService,
        healthContributorRegistry: HealthContributorRegistry,
    ) {
        healthContributorRegistry.register('retention', () => this.check());
    }

    public async runScheduled(): Promise<RetentionRunReport[]> {
        const reports: RetentionRunReport[] = [];

        for (const table of RetentionService.TABLES) {
            reports.push(await this.enforce(table));
        }

        return reports;
    }

    public async enforce(table: RetentionTable, now: Date = new Date()): Promise<RetentionRunReport> {
        const retentionDays = this.retentionDays(table);

        if (this.running.has(table)) {
            return this.skip(table, retentionDays, 'a run is already active in this process');
        }

        this.running.add(table);

        try {
            const lock = await tryNamedLock(
                this.dataSource,
                `pra:retention:${table}`,
                RetentionService.SCHEDULED_DELETE.maxDurationInMs,
                this.appConfigService.retention.distributedLockEnabled,
            );

            if (!lock) {
                return this.skip(table, retentionDays, 'a run is active in another PRA API instance');
            }

            try {
                return await this.deleteExpired(table, retentionDays, now);
            } finally {
                await lock.release();
            }
        } catch (error) {
            const report: RetentionRunReport = {
                table,
                status: 'failed',
                retentionDays,
                finishedAt: new Date().toISOString(),
                reason: error instanceof Error ? error.message : String(error),
            };
            this.lastRuns.set(table, report);
            this.logger.error(`[retention] ${table}: failed: ${report.reason}`);

            return report;
        } finally {
            this.running.delete(table);
        }
    }

    public check(now: number = Date.now()): HealthCheckEntry {
        const runs = RetentionService.TABLES.map((table) => this.lastRuns.get(table)).filter(
            (run): run is RetentionRunReport => run !== undefined,
        );
        const problems = runs
            .filter((run) => run.backlog || run.status === 'failed')
            .map((run) =>
                run.status === 'failed'
                    ? `${run.table}: last run failed`
                    : `${run.table}: rows older than ${run.retentionDays} days remain`,
            );

        return {
            status: problems.length > 0 ? 'warning' : 'up',
            critical: false,
            runs,
            ...(problems.length > 0 ? { message: problems.join('; ') } : {}),
            ...(runs.length === 0 ? { message: 'No retention run since the start' } : {}),
            checkedAt: new Date(now).toISOString(),
        };
    }

    private async deleteExpired(table: RetentionTable, retentionDays: number, now: Date): Promise<RetentionRunReport> {
        const cutoff = new Date(now.getTime() - retentionDays * RetentionService.DAY_IN_MS);
        const result = await BatchedDeleteUtility.deleteInBatches(
            this.dataSource,
            table,
            { sql: '`creation_date` < ?', parameters: [cutoff] },
            'creation_date',
            RetentionService.SCHEDULED_DELETE,
        );
        const oldest = await this.oldestCreationDate(table);
        const oldestAgeMs = oldest ? now.getTime() - oldest.getTime() : null;
        const backlog =
            oldestAgeMs !== null &&
            oldestAgeMs > retentionDays * RetentionService.DAY_IN_MS + RetentionService.BACKLOG_TOLERANCE_IN_MS;
        const report: RetentionRunReport = {
            table,
            status: result.complete ? 'completed' : 'incomplete',
            retentionDays,
            finishedAt: new Date().toISOString(),
            deleted: result.deleted,
            batches: result.batches,
            durationMs: result.durationMs,
            oldestRemainingAgeDays:
                oldestAgeMs === null ? null : Math.round((oldestAgeMs / RetentionService.DAY_IN_MS) * 100) / 100,
            backlog,
        };
        this.lastRuns.set(table, report);

        const line = `[retention] ${table}: deleted ${report.deleted} rows older than ${retentionDays} days in ${
            report.batches
        } batches in ${Math.round(result.durationMs / 1000)}s${result.complete ? '' : ' (time limit reached, the next run continues)'}; oldest remaining row ${
            report.oldestRemainingAgeDays === null ? 'none' : `${report.oldestRemainingAgeDays} days old`
        }`;

        if (backlog) {
            this.logger.warn(`${line}; BACKLOG: rows older than ${retentionDays} days plus 2 hours remain`);
        } else {
            this.logger.log(line);
        }

        return report;
    }

    private async oldestCreationDate(table: RetentionTable): Promise<Date | undefined> {
        const rows: unknown = await this.dataSource.query(`SELECT MIN(\`creation_date\`) AS oldest FROM \`${table}\``);
        const value = (rows as { oldest?: unknown }[])[0]?.oldest;

        if (value === null || value === undefined) {
            return undefined;
        }

        const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : undefined;

        if (!date) {
            return undefined;
        }

        return Number.isNaN(date.getTime()) ? undefined : date;
    }

    private skip(table: RetentionTable, retentionDays: number, reason: string): RetentionRunReport {
        this.logger.log(`[retention] ${table}: skipped, ${reason}`);

        return { table, status: 'skipped', retentionDays, finishedAt: new Date().toISOString(), reason };
    }

    private retentionDays(table: RetentionTable): number {
        return table === 'pra_logs'
            ? this.appConfigService.cronJob.logRetentionDays
            : this.appConfigService.retention.monitoringRetentionDays;
    }
}
