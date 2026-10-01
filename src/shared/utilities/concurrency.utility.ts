/** Bounded parallelism without an extra dependency (p-limit is only a transitive dependency of PRA API). */
export class ConcurrencyUtility {
    /**
     * Like `Promise.all(items.map(mapper))`, but with at most `limit` mappers running at the same time. Results keep
     * the order of the items. On the first rejection no further items are started and the returned promise rejects
     * with that error; mappers already running are not cancelled.
     */
    public static async mapWithLimit<T, R>(
        items: readonly T[],
        limit: number,
        mapper: (item: T, index: number) => Promise<R>,
    ): Promise<R[]> {
        if (!Number.isInteger(limit) || limit < 1) {
            throw new RangeError(`limit must be a positive integer, got ${limit}`);
        }

        const results = new Array<R>(items.length);
        let nextIndex = 0;
        let failed = false;

        const worker = async (): Promise<void> => {
            while (!failed && nextIndex < items.length) {
                const index = nextIndex++;

                try {
                    results[index] = await mapper(items[index] as T, index);
                } catch (error) {
                    failed = true;
                    throw error;
                }
            }
        };

        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

        return results;
    }
}
