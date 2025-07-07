import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class RetrievePraUsersDtoInput {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    public pageSize: number = 100;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    public pageNumber: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    public id?: number;

    @IsOptional()
    @IsString()
    public username?: string;
}
