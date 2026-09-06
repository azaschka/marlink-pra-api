import { PaginationUtility } from './pagination.utility';

describe('PaginationUtility', () => {
    describe('slicePage', () => {
        const items = [1, 2, 3, 4, 5, 6, 7];

        it('should return the first page', () => {
            expect(PaginationUtility.slicePage(items, 1, 3)).toEqual([1, 2, 3]);
        });

        it('should return a page from the middle', () => {
            expect(PaginationUtility.slicePage(items, 2, 3)).toEqual([4, 5, 6]);
        });

        it('should return a partial last page', () => {
            expect(PaginationUtility.slicePage(items, 3, 3)).toEqual([7]);
        });

        it('should return an empty page beyond the end', () => {
            expect(PaginationUtility.slicePage(items, 4, 3)).toEqual([]);
        });

        it('should treat page numbers below one as the first page', () => {
            expect(PaginationUtility.slicePage(items, 0, 3)).toEqual([1, 2, 3]);
        });

        it('should return nothing for a non-positive page size', () => {
            expect(PaginationUtility.slicePage(items, 1, 0)).toEqual([]);
        });

        it('should handle an empty result set', () => {
            expect(PaginationUtility.slicePage([], 1, 10)).toEqual([]);
        });
    });

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

    describe('queryUntilDuplicatePage', () => {
        it('should return all results until a duplicate page is encountered', async () => {
            const mockQueryFunction = jest
                .fn()
                .mockResolvedValueOnce([1, 2, 3]) // Page 1
                .mockResolvedValueOnce([4, 5]) // Page 2
                .mockResolvedValueOnce([4, 5]) // Page 3 (duplicate of Page 2)
                .mockResolvedValueOnce([6, 7]); // Page 4 (should not be called)

            const results = await PaginationUtility.queryUntilDuplicatePage(mockQueryFunction);

            expect(mockQueryFunction).toHaveBeenCalledTimes(3);
            expect(results).toEqual([1, 2, 3, 4, 5]);
        });

        it('should return all results until a duplicate page is encountered with omitted properties', async () => {
            const mockQueryFunction = jest
                .fn()
                .mockResolvedValueOnce([
                    { id: 1, name: 'Item 1', timestamp: '2023-01-01' },
                    { id: 2, name: 'Item 2', timestamp: '2023-01-01' },
                ]) // Page 1
                .mockResolvedValueOnce([
                    { id: 3, name: 'Item 3', timestamp: '2023-01-02' },
                    { id: 4, name: 'Item 4', timestamp: '2023-01-02' },
                ]) // Page 2
                .mockResolvedValueOnce([
                    { id: 3, name: 'Item 3', timestamp: '2023-01-03' }, // Different timestamp
                    { id: 4, name: 'Item 4', timestamp: '2023-01-03' }, // Different timestamp
                ]) // Page 3 (duplicate of Page 2 when ignoring 'timestamp')
                .mockResolvedValueOnce([{ id: 5, name: 'Item 5', timestamp: '2023-01-04' }]); // Page 4 (should not be called)

            const results = await PaginationUtility.queryUntilDuplicatePage(mockQueryFunction, ['timestamp']);

            expect(mockQueryFunction).toHaveBeenCalledTimes(3);
            expect(results).toEqual([
                { id: 1, name: 'Item 1', timestamp: '2023-01-01' },
                { id: 2, name: 'Item 2', timestamp: '2023-01-01' },
                { id: 3, name: 'Item 3', timestamp: '2023-01-02' },
                { id: 4, name: 'Item 4', timestamp: '2023-01-02' },
            ]);
        });

        it('should handle empty results on the first page', async () => {
            const mockQueryFunction = jest.fn().mockResolvedValueOnce([]);

            const results = await PaginationUtility.queryUntilDuplicatePage(mockQueryFunction);

            expect(mockQueryFunction).toHaveBeenCalledTimes(1);
            expect(results).toEqual([]);
        });
    });
});
