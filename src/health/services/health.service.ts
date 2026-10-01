import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';
import { name as serviceName, version } from '../../../package.json';
import { HealthCheckEntry } from '../../observability/models/health-check-entry.model';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { DatabaseHealthCheck } from '../checks/database.health-check';
import { StorageHealthCheck } from '../checks/storage.health-check';
import { buildHealthReport, HealthReport } from '../health-report';
import { MemorySamplerService } from './memory-sampler.service';

/**
 * Liveness, readiness and diagnostics. Only the database is readiness-critical; memory, disk and the checks of
 * feature modules (HealthContributorRegistry) are diagnostics that can make the service degraded, never
 * unavailable. Every check is bounded and cached, so health polling cannot add load under pressure.
 */
@Injectable()
export class HealthService implements BeforeApplicationShutdown {
    private shuttingDown = false;

    constructor(
        private readonly databaseHealthCheck: DatabaseHealthCheck,
        private readonly storageHealthCheck: StorageHealthCheck,
        private readonly memorySamplerService: MemorySamplerService,
        private readonly healthContributorRegistry: HealthContributorRegistry,
    ) {}

    public beforeApplicationShutdown(): void {
        this.shuttingDown = true;
    }

    public live(): { httpStatus: 200 | 503; body: Record<string, unknown> } {
        const memory = process.memoryUsage();

        return {
            httpStatus: this.shuttingDown ? 503 : 200,
            body: {
                status: this.shuttingDown ? 'shutting-down' : 'alive',
                uptime: process.uptime(),
                memory: {
                    used: Math.round(memory.heapUsed / 1024 / 1024),
                    total: Math.round(memory.heapTotal / 1024 / 1024),
                },
            },
        };
    }

    public async ready(): Promise<{
        httpStatus: 200 | 503;
        body: { status: 'ok' | 'error'; checks: Record<string, HealthCheckEntry> };
    }> {
        const database = await this.databaseHealthCheck.check();
        const ready = !this.shuttingDown && database.status === 'up';

        return { httpStatus: ready ? 200 : 503, body: { status: ready ? 'ok' : 'error', checks: { database } } };
    }

    public async report(): Promise<{ httpStatus: 200 | 503; body: HealthReport }> {
        const [database, storage, contributed] = await Promise.all([
            this.databaseHealthCheck.check(),
            this.storageHealthCheck.check(),
            this.healthContributorRegistry.collect(),
        ]);

        return buildHealthReport(
            serviceName,
            version,
            { database, storage, memoryHeap: this.memorySamplerService.check(), ...contributed },
            this.shuttingDown,
        );
    }
}
