export abstract class PaginationUtility {
    /**
     * @description Use only for queries that return paginated results and return empty arrays when there are no more results.
     */
    public static async queryUntilLastPage<T>(
        queryFunction: (pageNumber: number) => Promise<T[]>,
        initialPageNumber: number = 1,
    ): Promise<T[]> {
        const results: T[] = [];
        let pageNumber = initialPageNumber;
        let items: T[];

        do {
            items = await queryFunction(pageNumber);
            results.push(...items);
            pageNumber++;
        } while (items.length > 0);

        return results;
    }
}
