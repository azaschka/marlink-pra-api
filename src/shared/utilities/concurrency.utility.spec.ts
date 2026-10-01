import { ConcurrencyUtility } from './concurrency.utility';

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('ConcurrencyUtility.mapWithLimit', () => {
    it('never runs more than the limit at once and keeps the order of the results', async () => {
        let active = 0;
        let maxActive = 0;

        const results = await ConcurrencyUtility.mapWithLimit(
            Array.from({ length: 40 }, (_, i) => i),
            5,
            async (item) => {
                active++;
                maxActive = Math.max(maxActive, active);
                await new Promise((resolve) => setTimeout(resolve, item % 3));
                active--;

                return item * 2;
            },
        );

        expect(maxActive).toBe(5);
        expect(results).toEqual(Array.from({ length: 40 }, (_, i) => i * 2));
    });

    it('returns an empty array for no items', async () => {
        await expect(ConcurrencyUtility.mapWithLimit([], 5, () => Promise.resolve(1))).resolves.toEqual([]);
    });

    it('rejects with the first error and starts no further items', async () => {
        const started: number[] = [];

        const outcome = ConcurrencyUtility.mapWithLimit([0, 1, 2, 3, 4, 5], 2, async (item) => {
            started.push(item);
            await tick();

            if (item === 1) {
                throw new Error('lookup failed');
            }

            return item;
        });

        await expect(outcome).rejects.toThrow('lookup failed');
        await tick();
        await tick();
        expect(started).toEqual([0, 1, 2]);
    });

    it.each([0, -1, 1.5, Number.NaN])('rejects the invalid limit %s', async (limit) => {
        await expect(ConcurrencyUtility.mapWithLimit([1], limit, () => Promise.resolve(1))).rejects.toThrow(RangeError);
    });
});
