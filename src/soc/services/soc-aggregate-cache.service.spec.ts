import { AppConfigService } from '../../app-config/services/app-config.service';
import { SocAggregateCacheService } from './soc-aggregate-cache.service';

describe('SocAggregateCacheService', () => {
    const ttlInMs = 300000;

    let service: SocAggregateCacheService;
    let cacheTtlInMs: number;

    beforeEach(() => {
        jest.useFakeTimers();
        cacheTtlInMs = ttlInMs;
        service = new SocAggregateCacheService(mockAppConfigService(() => cacheTtlInMs));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should load once and serve subsequent calls from the cache', async () => {
        const load = jest.fn().mockResolvedValue(['a']);

        await expect(service.resolve('key', load)).resolves.toEqual(['a']);
        await expect(service.resolve('key', load)).resolves.toEqual(['a']);

        expect(load).toHaveBeenCalledTimes(1);
    });

    it('should keep entries of different keys apart', async () => {
        await service.resolve('tenant-1', jest.fn().mockResolvedValue('one'));

        await expect(service.resolve('tenant-2', jest.fn().mockResolvedValue('two'))).resolves.toBe('two');
        await expect(service.resolve('tenant-1', jest.fn())).resolves.toBe('one');
    });

    it('should reload once the entry has expired', async () => {
        const load = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

        await service.resolve('key', load);
        jest.advanceTimersByTime(ttlInMs + 1);

        await expect(service.resolve('key', load)).resolves.toBe('second');
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('should still serve the entry immediately before it expires', async () => {
        const load = jest.fn().mockResolvedValue('first');

        await service.resolve('key', load);
        jest.advanceTimersByTime(ttlInMs - 1);

        await expect(service.resolve('key', load)).resolves.toBe('first');
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('should collapse concurrent loads of the same key into a single aggregation', async () => {
        let resolveLoad: (value: string) => void = () => undefined;
        const load = jest.fn().mockReturnValue(
            new Promise<string>((resolve) => {
                resolveLoad = resolve;
            }),
        );

        const pending = [service.resolve('key', load), service.resolve('key', load), service.resolve('key', load)];
        resolveLoad('aggregated');

        await expect(Promise.all(pending)).resolves.toEqual(['aggregated', 'aggregated', 'aggregated']);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('should not cache a failed load and should propagate the error to every caller', async () => {
        const failure = new Error('upstream unavailable');
        const load = jest.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce('recovered');

        await expect(service.resolve('key', load)).rejects.toThrow(failure);
        await expect(service.resolve('key', load)).resolves.toBe('recovered');

        expect(load).toHaveBeenCalledTimes(2);
    });

    it('should bypass the cache entirely when the TTL is zero', async () => {
        cacheTtlInMs = 0;
        const load = jest.fn().mockResolvedValue('fresh');

        await service.resolve('key', load);
        await service.resolve('key', load);

        expect(load).toHaveBeenCalledTimes(2);
    });

    it('should reload after being invalidated', async () => {
        const load = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

        await service.resolve('key', load);
        service.invalidate();

        await expect(service.resolve('key', load)).resolves.toBe('second');
    });
});

function mockAppConfigService(cacheTtlInMs: () => number): AppConfigService {
    return {
        get soc() {
            return { cacheTtlInMs: cacheTtlInMs() };
        },
    } as AppConfigService;
}
