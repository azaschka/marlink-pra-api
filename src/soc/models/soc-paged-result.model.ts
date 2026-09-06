/**
 * A single page of results together with the size of the full result set.
 *
 * The SOC endpoints aggregate several upstream sources, so the total can only be
 * determined by the query handler that materialises them.
 */
export interface SocPagedResult<TItem> {
    items: TItem[];
    totalCount: number;
}
