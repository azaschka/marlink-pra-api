import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { RetentionService } from './retention.service';

const DAY = 24 * 60 * 60 * 1000;

describe('RetentionService', () => {
    let query: jest.Mock;
    let registry: HealthContributorRegistry;
    let service: RetentionService;
    let oldest: Date | null;
    let warn: jest.SpyInstance;
    const now = new Date('2026-10-01T08:00:00Z');

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        oldest = new Date(now.getTime() - 89 * DAY);
        query = jest.fn((sql: string) => {
            if (sql.startsWith('DELETE')) {
                return Promise.resolve({ affectedRows: 0 });
            }

            return Promise.resolve([{ oldest }]);
        });
        registry = new HealthContributorRegistry();
        service = new RetentionService(
            { query } as unknown as DataSource,
            {
                cronJob: { logRetentionDays: 90 },
                retention: { monitoringRetentionDays: 30, distributedLockEnabled: false },
            } as unknown as AppConfigService,
            registry,
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('deletes rows older than the retention of each table with the cutoff as parameter', async () => {
        const reports = await service.runScheduled();

        expect(reports.map((report) => [report.table, report.status, report.retentionDays])).toEqual([
            ['pra_logs', 'completed', 90],
            ['pra_monitorings', 'completed', 30],
        ]);
        const deletes = (query.mock.calls as unknown[][]).filter(([sql]) => String(sql).startsWith('DELETE'));
        expect(deletes[0]?.[0]).toBe(
            'DELETE FROM `pra_logs` WHERE `creation_date` < ? ORDER BY `creation_date` LIMIT 5000',
        );
    });

    it('computes the cutoff from the retention days', async () => {
        await service.enforce('pra_logs', now);

        const parameters = (query.mock.calls as unknown[][]).find(([sql]) =>
            String(sql).startsWith('DELETE'),
        )?.[1] as Date[];
        expect(parameters[0]).toEqual(new Date(now.getTime() - 90 * DAY));
    });

    it('skips a second run for the same table while one is active', async () => {
        let release: () => void = () => undefined;
        query.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve({ affectedRows: 0 }))));

        const first = service.enforce('pra_logs', now);
        const second = await service.enforce('pra_logs', now);
        release();
        await first;

        expect(second.status).toBe('skipped');
    });

    it('reports a backlog when rows older than the retention plus 2 hours remain', async () => {
        oldest = new Date(now.getTime() - 90 * DAY - 3 * 60 * 60 * 1000);

        const report = await service.enforce('pra_logs', now);

        expect(report.backlog).toBe(true);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('BACKLOG'));
        await expect(registry.collect()).resolves.toEqual({
            retention: expect.objectContaining({
                status: 'warning',
                message: 'pra_logs: rows older than 90 days remain',
            }) as unknown,
        });
    });

    it('is up after runs without backlog', async () => {
        oldest = new Date(Date.now() - 10 * DAY);
        await service.runScheduled();

        expect(service.check().status).toBe('up');
    });

    it('reports a failed run and keeps the service running', async () => {
        query.mockRejectedValueOnce(new Error('Lock wait timeout exceeded'));

        const report = await service.enforce('pra_logs', now);

        expect(report).toEqual(expect.objectContaining({ status: 'failed', reason: 'Lock wait timeout exceeded' }));
        expect(service.check().status).toBe('warning');
    });
});
