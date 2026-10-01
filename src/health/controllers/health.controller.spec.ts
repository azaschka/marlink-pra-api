import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { HealthCheckEntry } from '../../observability/models/health-check-entry.model';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { DatabaseHealthCheck } from '../checks/database.health-check';
import { StorageHealthCheck } from '../checks/storage.health-check';
import { HealthService } from '../services/health.service';
import { MemorySamplerService } from '../services/memory-sampler.service';
import { HealthReport } from '../health-report';
import { HealthController } from './health.controller';

const at = '2026-10-01T08:00:00.000Z';

describe('HealthController (HTTP)', () => {
    let app: INestApplication;
    let database: HealthCheckEntry;
    let memoryHeap: HealthCheckEntry;
    let healthService: HealthService;
    const registry = new HealthContributorRegistry();

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                HealthService,
                { provide: DatabaseHealthCheck, useValue: { check: () => Promise.resolve(database) } },
                {
                    provide: StorageHealthCheck,
                    useValue: { check: () => Promise.resolve({ status: 'up', critical: false, checkedAt: at }) },
                },
                { provide: MemorySamplerService, useValue: { check: () => memoryHeap } },
                { provide: HealthContributorRegistry, useValue: registry },
            ],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
        healthService = moduleRef.get(HealthService);
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        database = { status: 'up', critical: true, latencyMs: 2, checkedAt: at };
        memoryHeap = { status: 'up', critical: false, checkedAt: at };
        (healthService as unknown as { shuttingDown: boolean }).shuttingDown = false;
    });

    const server = () => app.getHttpServer() as Server;

    it('answers 200 degraded for a sustained memory warning (it used to answer 503)', async () => {
        memoryHeap = { status: 'warning', critical: false, message: 'sustained', checkedAt: at };

        const response = await request(server()).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({ status: 'ok', overallStatus: 'degraded', service: 'marlink-pra-api' }),
        );
        expect((response.body as HealthReport).checks.memoryHeap?.status).toBe('warning');
    });

    it('answers 503 unavailable with the report itself as body when the database is down', async () => {
        database = { status: 'down', critical: true, message: 'No database connection within 2000 ms', checkedAt: at };

        const response = await request(server()).get('/health');

        expect(response.status).toBe(503);
        expect((response.body as HealthReport).overallStatus).toBe('unavailable');
        expect((response.body as HealthReport).details.database).toEqual({ status: 'down' });
    });

    it('includes the checks of feature modules', async () => {
        registry.register('discrepancyScan', () => ({ status: 'warning', critical: false, checkedAt: at }));

        const response = await request(server()).get('/health');

        expect((response.body as HealthReport).checks.discrepancyScan?.status).toBe('warning');
        expect((response.body as HealthReport).overallStatus).toBe('degraded');
    });

    it('readiness depends on the database only', async () => {
        memoryHeap = { status: 'warning', critical: false, checkedAt: at };
        expect((await request(server()).get('/health/ready')).status).toBe(200);

        database = { status: 'down', critical: true, checkedAt: at };
        const notReady = await request(server()).get('/health/ready');

        expect(notReady.status).toBe(503);
        expect(notReady.body).toEqual({ status: 'error', checks: { database } });
    });

    it('liveness answers 200 regardless of dependencies and 503 while shutting down', async () => {
        database = { status: 'down', critical: true, checkedAt: at };
        expect((await request(server()).get('/health/live')).status).toBe(200);

        healthService.beforeApplicationShutdown();

        expect((await request(server()).get('/health/live')).status).toBe(503);
        expect((await request(server()).get('/health/ready')).status).toBe(503);
    });
});
