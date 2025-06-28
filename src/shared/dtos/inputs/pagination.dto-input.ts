import { Expose } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class PaginationDtoInput {
    @Expose({ name: 'per_page' })
    @IsInt()
    @IsNotEmpty()
    public perPage!: number;

    @Expose({ name: 'current_page' })
    @IsInt()
    @IsNotEmpty()
    public currentPage!: number;
}
