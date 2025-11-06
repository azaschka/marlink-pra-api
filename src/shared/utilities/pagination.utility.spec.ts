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
