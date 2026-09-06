import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination metadata that every paginated endpoint returns alongside its items.
 *
 * Centralising the derivation of `totalPages` avoids each endpoint re-implementing
 * (and eventually disagreeing on) the rounding rules.
 */
export class PaginationMetaDtoOutput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The 1-based index of the page contained in this response.',
    })
    public pageNumber!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The maximum number of items that a single page may contain.',
    })
    public pageSize!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The total number of records matching the query, across all pages.',
    })
    public totalCount!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The total number of pages available for the query.',
    })
    public totalPages!: number;

    public static create(pageNumber: number, pageSize: number, totalCount: number): PaginationMetaDtoOutput {
        return {
            pageNumber,
            pageSize,
            totalCount,
            totalPages: pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0,
        };
    }
}
