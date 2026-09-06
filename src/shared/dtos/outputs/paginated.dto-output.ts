import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDtoOutput } from './pagination-meta.dto-output';

export interface PaginatedDtoOutput<TItem> {
    items: TItem[];
    pagination: PaginationMetaDtoOutput;
}

/**
 * Builds a paginated response DTO for the given item type.
 *
 * TypeScript generics are erased at runtime, so Swagger cannot describe a generic
 * `Paginated<T>` on its own. This mixin creates a concrete, uniquely named class per
 * item type (e.g. `PaginatedSocJumpItemRetrievedDtoOutput`) so the OpenAPI document
 * contains a proper schema instead of an untyped object.
 *
 * @example
 * export class SocJumpItemsRetrievedDtoOutput extends PaginatedDtoOutputOf(SocJumpItemRetrievedDtoOutput) {}
 */
export function PaginatedDtoOutputOf<TModel extends Type<unknown>>(model: TModel) {
    class PaginatedDtoOutputClass implements PaginatedDtoOutput<InstanceType<TModel>> {
        @ApiProperty({
            required: true,
            type: model,
            isArray: true,
            description: 'The items contained in the requested page.',
        })
        public items!: InstanceType<TModel>[];

        @ApiProperty({
            required: true,
            type: PaginationMetaDtoOutput,
            description: 'Pagination metadata describing the requested page and the full result set.',
        })
        public pagination!: PaginationMetaDtoOutput;
    }

    // Give the generated class a stable, unique name so Swagger emits a distinct schema.
    Object.defineProperty(PaginatedDtoOutputClass, 'name', { value: `Paginated${model.name}` });

    return PaginatedDtoOutputClass;
}
