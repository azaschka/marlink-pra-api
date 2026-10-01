import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { HealthCheckEntry } from '../../observability/models/health-check-entry.model';
import { RuntimeMetricsService } from '../../observability/services/runtime-metrics.service';

interface HeapSample {
    readonly at: number;
    readonly heapUsedBytes: number;
}

/**
 * Samples heapUsed every 10 s into a ring of 60 samples. memoryHeap is a warning when the minimum heapUsed of the
 * last 300 s (at least 3 samples) is above HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB, so heap that is only high
 * until the next garbage collection does not trigger it. The warning clears when that minimum drops below 90 % of
 * the threshold (hysteresis). The threshold itself is unchanged (default 512 MiB); memory is never critical.
 */
@Injectable()
export class MemorySamplerService implements OnApplicationBootstrap, OnApplicationShutdown {
    public static readonly SAMPLE_INTERVAL_IN_MS = 10000;
    public static readonly WINDOW_IN_MS = 300000;
    private static readonly MAX_SAMPLES = 60;
    private static readonly MIN_SAMPLES_IN_WINDOW = 3;
    private static readonly CLEAR_RATIO = 0.9;
    private static readonly MEGABYTE = 1024 * 1024;

    private readonly samples: HeapSample[] = [];
    private warning = false;
    private windowMinimumBytes: number | undefined;
    private samplesInWindow = 0;
    private timer: NodeJS.Timeout | undefined;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly runtimeMetricsService: RuntimeMetricsService,
    ) {}

    public onApplicationBootstrap(): void {
        this.sample();
        this.timer = setInterval(() => this.sample(), MemorySamplerService.SAMPLE_INTERVAL_IN_MS);
        this.timer.unref();
    }

    public onApplicationShutdown(): void {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    /** Takes one sample and updates the evaluation. */
    public sample(now: number = Date.now()): void {
        this.samples.push({ at: now, heapUsedBytes: this.runtimeMetricsService.memory().heapUsedBytes });

        if (this.samples.length > MemorySamplerService.MAX_SAMPLES) {
            this.samples.splice(0, this.samples.length - MemorySamplerService.MAX_SAMPLES);
        }

        const window = this.samples.filter((sample) => sample.at > now - MemorySamplerService.WINDOW_IN_MS);
        this.samplesInWindow = window.length;

        if (window.length < MemorySamplerService.MIN_SAMPLES_IN_WINDOW) {
            this.windowMinimumBytes = undefined;

            return;
        }

        const minimum = Math.min(...window.map((sample) => sample.heapUsedBytes));
        const threshold = this.thresholdBytes();
        this.windowMinimumBytes = minimum;

        if (!this.warning && minimum > threshold) {
            this.warning = true;
        } else if (this.warning && minimum < threshold * MemorySamplerService.CLEAR_RATIO) {
            this.warning = false;
        }
    }

    /** Reads the last evaluation and the current figures; does no work of its own. */
    public check(): HealthCheckEntry {
        const memory = this.runtimeMetricsService.memory();
        const thresholdMb = this.appConfigService.health.memoryHeapUsageThresholdInMB;
        const toMb = (bytes: number) => Math.round(bytes / MemorySamplerService.MEGABYTE);

        return {
            status: this.warning ? 'warning' : 'up',
            critical: false,
            heapUsedBytes: memory.heapUsedBytes,
            heapTotalBytes: memory.heapTotalBytes,
            heapSizeLimitBytes: memory.heapSizeLimitBytes,
            rssBytes: memory.rssBytes,
            externalBytes: memory.externalBytes,
            arrayBuffersBytes: memory.arrayBuffersBytes,
            warningThresholdBytes: this.thresholdBytes(),
            thresholdSource: `HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB=${thresholdMb}`,
            evaluation: `minimum heapUsed over the last ${MemorySamplerService.WINDOW_IN_MS / 1000} s`,
            windowMinimumBytes: this.windowMinimumBytes ?? null,
            samplesInWindow: this.samplesInWindow,
            ...(this.warning && this.windowMinimumBytes !== undefined
                ? {
                      message: `heapUsed stayed above ${thresholdMb} MiB for the whole ${
                          MemorySamplerService.WINDOW_IN_MS / 1000
                      } s window (minimum ${toMb(this.windowMinimumBytes)} MiB)`,
                  }
                : {}),
            checkedAt: new Date().toISOString(),
        };
    }

    private thresholdBytes(): number {
        return this.appConfigService.health.memoryHeapUsageThresholdInMB * MemorySamplerService.MEGABYTE;
    }
}
