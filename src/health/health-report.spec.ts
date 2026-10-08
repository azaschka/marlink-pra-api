import { HealthCheckEntry } from '../observability/models/health-check-entry.model';
import { buildHealthReport } from './health-report';

const at = '2026-10-01T08:00:00.000Z';
const up = (critical = false): HealthCheckEntry => ({ status: 'up', critical, checkedAt: at });

describe('buildHealthReport', () => {
    it('is healthy with HTTP 200 when every check is up', () => {
        const { httpStatus, body } = buildHealthReport('pra-sync-api', '3.2.0', {
            database: up(true),
            memoryHeap: up(),
        });

        expect(httpStatus).toBe(200);
        expect(body).toEqual(
            expect.objectContaining({
                status: 'ok',
                overallStatus: 'healthy',
                service: 'pra-sync-api',
                version: '3.2.0',
                error: {},
                details: { database: { status: 'up' }, memoryHeap: { status: 'up' } },
            }),
        );
    });

    it('is degraded with HTTP 200 for a memory warning, and shows the warning as up in the legacy fields', () => {
        const { httpStatus, body } = buildHealthReport('pra-sync-api', '3.2.0', {
            database: up(true),
            memoryHeap: { status: 'warning', critical: false, message: 'sustained', checkedAt: at },
        });

        expect(httpStatus).toBe(200);
        expect(body.status).toBe('ok');
        expect(body.overallStatus).toBe('degraded');
        expect(body.details.memoryHeap).toEqual({ status: 'up' });
        expect(body.checks.memoryHeap?.status).toBe('warning');
    });

    it('is degraded with HTTP 200 when a non-critical dependency is down', () => {
        const { httpStatus, body } = buildHealthReport('pra-api', '3.2.0', {
            database: up(true),
            praSyncApi: { status: 'down', critical: false, checkedAt: at },
        });

        expect(httpStatus).toBe(200);
        expect(body.status).toBe('ok');
        expect(body.overallStatus).toBe('degraded');
        expect(body.error).toEqual({ praSyncApi: { status: 'down' } });
    });

    it('is unavailable with HTTP 503 when the database is down', () => {
        const { httpStatus, body } = buildHealthReport('pra-api', '3.2.0', {
            database: {
                status: 'down',
                critical: true,
                message: 'No database connection within 2000 ms',
                checkedAt: at,
            },
            storage: up(),
        });

        expect(httpStatus).toBe(503);
        expect(body.status).toBe('error');
        expect(body.overallStatus).toBe('unavailable');
        expect(body.details).toEqual({ database: { status: 'down' }, storage: { status: 'up' } });
    });

    it('is unavailable while shutting down', () => {
        const { httpStatus, body } = buildHealthReport('pra-api', '3.2.0', { database: up(true) }, true);

        expect(httpStatus).toBe(503);
        expect(body.overallStatus).toBe('unavailable');
        expect(body.checks.shutdown?.status).toBe('down');
    });
});
