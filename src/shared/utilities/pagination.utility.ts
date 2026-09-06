import { ObjectUtility } from './object.utility';

export abstract class PaginationUtility {
    /**
     * @description Extracts a single page from an already materialised result set.
     * Use for endpoints that aggregate several upstream sources in memory and therefore
     * cannot delegate paging to the database.
     */
    public static slicePage<T>(items: T[], pageNumber: number, pageSize: number): T[] {
        if (pageSize <= 0) {
            return [];
        }

        const startIndex = (Math.max(1, pageNumber) - 1) * pageSize;

        return items.slice(startIndex, startIndex + pageSize);
    }

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

    public static async queryUntilDuplicatePage<T extends object>(
        queryFunction: (pageNumber: number) => Promise<T[]>,
        omitProperties: (keyof T)[] = [],
        initialPageNumber: number = 1,
    ): Promise<T[]> {
        const results: T[] = [];
        let pageNumber = initialPageNumber;
        let previousPage: T[] = [];

        while (true) {
            const items = await queryFunction(pageNumber);

            // Stop if no items are returned
            if (items.length === 0) {
                break;
            }

            if (omitProperties.length > 0) {
                const trimmedItems = items.map((item) => ObjectUtility.stripProperties(item, ...omitProperties));
                const trimmedPreviousPage = previousPage.map((item) =>
                    ObjectUtility.stripProperties(item, ...omitProperties),
                );

                // Stop if the current page is identical to the previous one
                if (JSON.stringify(trimmedItems) === JSON.stringify(trimmedPreviousPage)) {
                    break;
                }
            } else {
                // Stop if the current page is identical to the previous one
                if (JSON.stringify(items) === JSON.stringify(previousPage)) {
                    break;
                }
            }

            results.push(...items);
            previousPage = items;
            pageNumber++;
        }

        return results;
    }
}
