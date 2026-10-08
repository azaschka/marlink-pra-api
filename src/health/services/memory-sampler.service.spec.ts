import { AppConfigService } from '../../app-config/services/app-config.service';
import { RuntimeMetricsService } from '../../observability/services/runtime-metrics.service';
import { MemorySamplerService } from './memory-sampler.service';

const MB = 1024 * 1024;

describe('MemorySamplerService', () => {
    let heapUsedMb: number;
    let sampler: MemorySamplerService;
    let now: number;

    const sampleSequence = (values: number[]) => {
        for (const value of values) {
            heapUsedMb = value;
            now += MemorySamplerService.SAMPLE_INTERVAL_IN_MS;
            sampler.sample(now);
        }
    };

    beforeEach(() => {
        now = 0;
        heapUsedMb = 100;
        sampler = new MemorySamplerService(
            { health: { memoryHeapUsageThresholdInMB: 512 } } as AppConfigService,
            {
                memory: () => ({
                    heapUsedBytes: heapUsedMb * MB,
                    heapTotalBytes: 800 * MB,
                    heapSizeLimitBytes: 2048 * MB,
                    rssBytes: 900 * MB,
                    externalBytes: 5 * MB,
                    arrayBuffersBytes: 1 * MB,
                }),
            } as unknown as RuntimeMetricsService,
        );
    });

    it('does not warn for heap that is only high until the next garbage collection', () => {
        // 5 minutes of a sawtooth that peaks at 700 MiB but drops to 300 MiB after each collection
        sampleSequence(Array.from({ length: 30 }, (_, i) => (i % 5 === 4 ? 300 : 700)));

        expect(sampler.check().status).toBe('up');
    });

    it('warns when heapUsed stays above the threshold for the whole window', () => {
        sampleSequence(new Array<number>(30).fill(600));

        const check = sampler.check();
        expect(check.status).toBe('warning');
        expect(check.critical).toBe(false);
        expect(check.windowMinimumBytes).toBe(600 * MB);
        expect(check.message).toBe('heapUsed stayed above 512 MiB for the whole 300 s window (minimum 600 MiB)');
    });

    it('clears the warning only below 90 % of the threshold (hysteresis)', () => {
        sampleSequence(new Array<number>(30).fill(600));
        sampleSequence(new Array<number>(30).fill(480)); // below the threshold, above 90 %
        expect(sampler.check().status).toBe('warning');

        sampleSequence(new Array<number>(30).fill(450)); // below 460.8 MiB
        expect(sampler.check().status).toBe('up');
    });

    it('does not decide with fewer than 3 samples', () => {
        heapUsedMb = 900;
        sampler.sample(now);
        sampler.sample(now + 1);

        expect(sampler.check().status).toBe('up');
        expect(sampler.check().windowMinimumBytes).toBeNull();
    });

    it('reports the effective threshold, its source and the heap limit', () => {
        const check = sampler.check();

        expect(check.warningThresholdBytes).toBe(512 * MB);
        expect(check.thresholdSource).toBe('HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB=512');
        expect(check.heapSizeLimitBytes).toBe(2048 * MB);
    });

    it('keeps at most 60 samples', () => {
        sampleSequence(new Array<number>(200).fill(100));

        expect((sampler as unknown as { samples: unknown[] }).samples).toHaveLength(60);
    });
});
