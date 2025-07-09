import { PaginationUtility } from './pagination.utility';

describe('PaginationUtility', () => {
    describe('queryUntilLastPage', () => {
        it('should return all results from paginated queries', async () => {
            const mockQueryFunction = jest
                .fn()
                .mockResolvedValueOnce([1, 2, 3]) // Page 1
                .mockResolvedValueOnce([4, 5]) // Page 2
                .mockResolvedValueOnce([]); // Page 3 (no more results)

            const results = await PaginationUtility.queryUntilLastPage(mockQueryFunction);

            expect(mockQueryFunction).toHaveBeenCalledTimes(3);
            expect(results).toEqual([1, 2, 3, 4, 5]);
        });

        it('should handle empty results on the first page', async () => {
            const mockQueryFunction = jest.fn().mockResolvedValueOnce([]);

            const results = await PaginationUtility.queryUntilLastPage(mockQueryFunction);

            expect(mockQueryFunction).toHaveBeenCalledTimes(1);
            expect(results).toEqual([]);
        });
    });
});
