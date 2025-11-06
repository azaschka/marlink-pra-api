import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { JumpGroupType } from '../../enums';

export class RetrieveProtocolTunnelJumpsDtoInput {
    @ApiProperty({
        required: false,
        type: Number,
        default: 100,
        description: 'The number of items to include in a paginated response.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public pageSize: number = 100;

    @ApiProperty({
        required: false,
        type: Number,
        default: 1,
        description: 'The 1-based index of the desired page.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public pageNumber: number = 1;

    @ApiProperty({ required: false, type: String })
    @IsString()
    @IsOptional()
    public name?: string;

    @ApiProperty({ required: false, type: String })
    @IsString()
    @IsOptional()
    public hostname?: string;

    @ApiProperty({ required: false, type: [Number] })
    @Type(() => Number)
    @IsInt({ each: true })
    @IsOptional()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    public jumpGroupIds?: number[];

    @ApiProperty({ required: false, enum: JumpGroupType })
    @IsEnum(JumpGroupType)
    @IsOptional()
    public jumpGroupType?: JumpGroupType;

    @ApiProperty({ required: false, type: Number })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public jumpointId?: number;

    @ApiProperty({ required: false, type: String })
    @IsString()
    @IsOptional()
    public tag?: string;
}
