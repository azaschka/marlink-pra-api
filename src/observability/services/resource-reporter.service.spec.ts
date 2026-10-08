import { Logger } from '@nestjs/common';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { ResourceReportRegistry } from './resource-report-registry.service';
import { ResourceReporterService } from './resource-reporter.service';
import { RuntimeMetricsService } from './runtime-metrics.service';

describe('ResourceReporterService', () => {
    const megabyte = 1024 * 1024;
    let log: jest.SpyInstance;
    let registry: ResourceReportRegistry;
    let metrics: jest.Mocked<Pick<RuntimeMetricsService, 'memory' | 'pool' | 'repositoryCacheEntries'>>;

    const createService = (resourceReportIntervalInMs: number) =>
        new ResourceReporterService(
            { observability: { resourceReportIntervalInMs } } as AppConfigService,
            metrics as unknown as RuntimeMetricsService,
            registry,
        );

    beforeEach(() => {
        jest.useFakeTimers();
        log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        registry = new ResourceReportRegistry();
        metrics = {
            memory: jest.fn().mockReturnValue({
                heapUsedBytes: 300 * megabyte,
                heapTotalBytes: 350 * megabyte,
                heapSizeLimitBytes: 2048 * megabyte,
                rssBytes: 500 * megabyte,
                externalBytes: 20 * megabyte,
                arrayBuffersBytes: 5 * megabyte,
            }),
            pool: jest.fn().mockReturnValue({ all: 10, free: 2, queued: 7 }),
            repositoryCacheEntries: jest.fn().mockReturnValue(42),
        };
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('writes one parseable JSON line in MB with pool, cache and contributor figures', () => {
        registry.register('logWriter', () => ({ buffered: 12, dropped: 0 }));
        const service = createService(300000);

        service.onApplicationBootstrap();

        expect(log).toHaveBeenCalledTimes(1);
        const line = (log.mock.calls as unknown[][])[0]?.[0] as string;
        expect(line).not.toContain('\n');
        expect(JSON.parse(line)).toEqual({
            heapUsedMB: 300,
            heapTotalMB: 350,
            heapSizeLimitMB: 2048,
            rssMB: 500,
            externalMB: 20,
            arrayBuffersMB: 5,
            repositoryCacheEntries: 42,
            pool: { all: 10, free: 2, queued: 7 },
            logWriter: { buffered: 12, dropped: 0 },
        });
        service.onApplicationShutdown();
    });

    it('reports once per interval and stops on shutdown', () => {
        const service = createService(60000);

        service.onApplicationBootstrap();
        jest.advanceTimersByTime(180000);
        expect(log).toHaveBeenCalledTimes(4);

        service.onApplicationShutdown();
        jest.advanceTimersByTime(180000);
        expect(log).toHaveBeenCalledTimes(4);
    });

    it('is disabled by an interval of 0', () => {
        const service = createService(0);

        service.onApplicationBootstrap();
        jest.advanceTimersByTime(600000);

        expect(log).not.toHaveBeenCalled();
    });

    it('does not throw from the timer when collecting figures fails', () => {
        const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        metrics.memory.mockImplementation(() => {
            throw new Error('unavailable');
        });
        const service = createService(60000);

        expect(() => service.onApplicationBootstrap()).not.toThrow();
        expect(() => jest.advanceTimersByTime(60000)).not.toThrow();
        expect(warn).toHaveBeenCalledWith('Resource report failed: unavailable');
        service.onApplicationShutdown();
    });
});
