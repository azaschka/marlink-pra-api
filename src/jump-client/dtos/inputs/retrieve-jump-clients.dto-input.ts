import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { JumpClientConnectionType, JumpClientGroupType } from '../../enums';

export class RetrieveJumpClientsDtoInput {
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

    @ApiProperty({ required: false, type: String, description: 'Filters Jump Clients by the given name.' })
    @IsString()
    @IsOptional()
    public name?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters Jump Clients by the given hostname (computer name).',
    })
    @IsString()
    @IsOptional()
    public hostname?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters Jump Clients by the given fully qualified domain name.',
    })
    @IsString()
    @IsOptional()
    public fqdn?: string;

    @ApiProperty({ required: false, type: String, description: 'Filters Jump Clients by the given tag.' })
    @IsString()
    @IsOptional()
    public tag?: string;

    @ApiProperty({ required: false, type: [Number], description: 'Filters Jump Clients by the given jump group ids.' })
    @Type(() => Number)
    @IsInt({ each: true })
    @IsOptional()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    public jumpGroupIds?: number[];

    @ApiProperty({
        required: false,
        enum: JumpClientGroupType,
        description: 'Filters Jump Clients by the given jump group type.',
    })
    @IsEnum(JumpClientGroupType)
    @IsOptional()
    public jumpGroupType?: JumpClientGroupType;

    @ApiProperty({ required: false, type: String, description: 'Filters Jump Clients by the given console user.' })
    @IsString()
    @IsOptional()
    public consoleUser?: string;

    @ApiProperty({ required: false, type: String, description: 'Filters Jump Clients by the given public IP address.' })
    @IsString()
    @IsOptional()
    public publicIp?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters Jump Clients by the given private IP address.',
    })
    @IsString()
    @IsOptional()
    public privateIp?: string;

    @ApiProperty({
        required: false,
        enum: JumpClientConnectionType,
        description: 'Filters Jump Clients by the given connection type.',
    })
    @IsEnum(JumpClientConnectionType)
    @IsOptional()
    public connectionType?: JumpClientConnectionType;
}
