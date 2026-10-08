import { CachedCheck, withTimeout } from './cached-check';

describe('CachedCheck', () => {
    it('shares one run between concurrent callers and caches the result for the TTL', async () => {
        let now = 0;
        let resolveRun: (value: string) => void = () => undefined;
        const run = jest.fn(() => new Promise<string>((resolve) => (resolveRun = resolve)));
        const check = new CachedCheck(5000, run, () => now);

        const callers = Array.from({ length: 20 }, () => check.get());
        resolveRun('up');
        await expect(Promise.all(callers)).resolves.toEqual(Array(20).fill('up'));
        await check.get();
        now = 5001;
        const refreshed = check.get();
        resolveRun('down');

        await expect(refreshed).resolves.toBe('down');
        expect(run).toHaveBeenCalledTimes(2);
    });
});

describe('withTimeout', () => {
    it('returns the fallback when the promise does not settle in time', async () => {
        await expect(withTimeout(new Promise(() => undefined), 10, () => 'fallback')).resolves.toBe('fallback');
    });

    it('returns the value when it settles in time', async () => {
        await expect(withTimeout(Promise.resolve('value'), 1000, () => 'fallback')).resolves.toBe('value');
    });
});
