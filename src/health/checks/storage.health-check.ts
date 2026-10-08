import { Injectable } from '@nestjs/common';
import { statfs } from 'fs/promises';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { HealthCheckEntry } from '../../observability/models/health-check-entry.model';
import { CachedCheck, withTimeout } from './cached-check';

/**
 * Disk usage of STORAGE_ROOT_PATH (the volume the service writes to), or of / when it is not set. Non-critical:
 * a full disk is a warning, the service keeps answering. Cached for 30 s; statfs on a hanging network volume is
 * bounded by 2 s.
 */
@Injectable()
export class StorageHealthCheck {
    private static readonly CACHE_TTL_IN_MS = 30000;
    private static readonly TIMEOUT_IN_MS = 2000;
    private static readonly UNSET_PATH = 'unknown';

    private readonly cached = new CachedCheck<HealthCheckEntry>(StorageHealthCheck.CACHE_TTL_IN_MS, () => this.run());

    constructor(private readonly appConfigService: AppConfigService) {}

    public check(): Promise<HealthCheckEntry> {
        return this.cached.get();
    }

    private run(): Promise<HealthCheckEntry> {
        const configuredPath = this.appConfigService.storage.rootPath;
        const usesConfiguredPath = !!configuredPath && configuredPath !== StorageHealthCheck.UNSET_PATH;
        const path = usesConfiguredPath ? configuredPath : '/';
        const pathSource = usesConfiguredPath ? 'STORAGE_ROOT_PATH' : 'root file system (STORAGE_ROOT_PATH not set)';
        const warningPercent = this.appConfigService.health.diskStorageUsageThresholdInPercent;

        return withTimeout(this.measure(path, pathSource, warningPercent), StorageHealthCheck.TIMEOUT_IN_MS, () => ({
            status: 'warning',
            critical: false,
            pathSource,
            message: `No answer from the file system within ${StorageHealthCheck.TIMEOUT_IN_MS} ms`,
            checkedAt: new Date().toISOString(),
        }));
    }

    private async measure(path: string, pathSource: string, warningPercent: number): Promise<HealthCheckEntry> {
        try {
            const stats = await statfs(path);
            const usedPercent = stats.blocks > 0 ? ((stats.blocks - stats.bfree) / stats.blocks) * 100 : 0;
            const rounded = Math.round(usedPercent * 10) / 10;
            const warning = usedPercent >= warningPercent;

            return {
                status: warning ? 'warning' : 'up',
                critical: false,
                usedPercent: rounded,
                warningPercent,
                freeBytes: stats.bavail * stats.bsize,
                pathSource,
                ...(warning
                    ? { message: `Disk usage ${rounded} % reached the warning threshold of ${warningPercent} %` }
                    : {}),
                checkedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'warning',
                critical: false,
                pathSource,
                message: `Disk usage could not be read (${(error as { code?: string }).code ?? 'error'})`,
                checkedAt: new Date().toISOString(),
            };
        }
    }
}
