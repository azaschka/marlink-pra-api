import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { ResourceReportRegistry } from './resource-report-registry.service';
import { RuntimeMetricsService } from './runtime-metrics.service';

/**
 * Writes one JSON line with memory, pool and feature figures at a fixed interval
 * (RESOURCE_REPORT_INTERVAL_IN_MS, default 5 minutes, 0 disables it). Meant for trend analysis in the
 * container logs: heap floor, repository cache size, pool queue, background work and log writer drops.
 */
@Injectable()
export class ResourceReporterService implements OnApplicationBootstrap, OnApplicationShutdown {
    private static readonly MEGABYTE = 1024 * 1024;

    private readonly logger = new Logger('ResourceReport');
    private timer: NodeJS.Timeout | undefined;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly runtimeMetricsService: RuntimeMetricsService,
        private readonly resourceReportRegistry: ResourceReportRegistry,
    ) {}

    public onApplicationBootstrap(): void {
        const intervalInMs = this.appConfigService.observability.resourceReportIntervalInMs;

        if (intervalInMs <= 0) {
            return;
        }

        this.timer = setInterval(() => this.report(), intervalInMs);
        this.timer.unref();
        this.report();
    }

    public onApplicationShutdown(): void {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    public buildReport(): Record<string, unknown> {
        const memory = this.runtimeMetricsService.memory();
        const toMegabytes = (bytes: number) => Math.round(bytes / ResourceReporterService.MEGABYTE);

        return {
            heapUsedMB: toMegabytes(memory.heapUsedBytes),
            heapTotalMB: toMegabytes(memory.heapTotalBytes),
            heapSizeLimitMB: toMegabytes(memory.heapSizeLimitBytes),
            rssMB: toMegabytes(memory.rssBytes),
            externalMB: toMegabytes(memory.externalBytes),
            arrayBuffersMB: toMegabytes(memory.arrayBuffersBytes),
            repositoryCacheEntries: this.runtimeMetricsService.repositoryCacheEntries(),
            pool: this.runtimeMetricsService.pool(),
            ...this.resourceReportRegistry.collect(),
        };
    }

    private report(): void {
        try {
            this.logger.log(JSON.stringify(this.buildReport()));
        } catch (error) {
            this.logger.warn(`Resource report failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
