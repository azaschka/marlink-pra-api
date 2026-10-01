import { HealthCheckEntry } from '../../observability/models/health-check-entry.model';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { DatabaseHealthCheck } from '../checks/database.health-check';
import { StorageHealthCheck } from '../checks/storage.health-check';
import { HealthService } from './health.service';
import { MemorySamplerService } from './memory-sampler.service';

const at = '2026-10-01T08:00:00.000Z';
const up = (critical: boolean): HealthCheckEntry => ({ status: 'up', critical, checkedAt: at });

/** The PRA API part of the contract: the Sync API is a non-critical dependency. */
describe('HealthService with the Sync API as dependency', () => {
    let praSyncApi: HealthCheckEntry;
    let database: HealthCheckEntry;
    let service: HealthService;

    beforeEach(() => {
        database = up(true);
        const registry = new HealthContributorRegistry();
        registry.register('praSyncApi', () => praSyncApi);
        service = new HealthService(
            { check: () => Promise.resolve(database) } as unknown as DatabaseHealthCheck,
            { check: () => Promise.resolve(up(false)) } as unknown as StorageHealthCheck,
            { check: () => up(false) } as unknown as MemorySamplerService,
            registry,
        );
    });

    it('answers 200 degraded and marks only the Sync API when it reports a heap warning', async () => {
        praSyncApi = { status: 'warning', critical: false, remoteWarnings: ['memoryHeap'], checkedAt: at };

        const { httpStatus, body } = await service.report();

        expect(httpStatus).toBe(200);
        expect(body.overallStatus).toBe('degraded');
        expect(
            Object.entries(body.checks)
                .filter(([, c]) => c.status !== 'up')
                .map(([n]) => n),
        ).toEqual(['praSyncApi']);
    });

    it('answers 200 degraded when the Sync API is unreachable', async () => {
        praSyncApi = { status: 'down', critical: false, reachable: false, checkedAt: at };

        const { httpStatus, body } = await service.report();

        expect(httpStatus).toBe(200);
        expect(body.status).toBe('ok');
        expect(body.error).toEqual({ praSyncApi: { status: 'down' } });
    });

    it('answers 503 on /health and /health/ready when its own database is down', async () => {
        praSyncApi = up(false);
        database = { status: 'down', critical: true, checkedAt: at };

        expect((await service.report()).httpStatus).toBe(503);
        expect((await service.ready()).httpStatus).toBe(503);
    });
});
