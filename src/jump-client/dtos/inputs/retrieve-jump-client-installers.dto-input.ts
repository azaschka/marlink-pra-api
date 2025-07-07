import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { JumpClientConnectionType, JumpClientGroupType } from '../../enums';

export class RetrieveJumpClientInstallersDtoInput {
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

    @ApiProperty({ required: false, type: String, description: 'Filters Jump Clients installers by the given name.' })
    @IsString()
    @IsOptional()
    public name?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters Jump Clients installers by the given hostname (computer name).',
    })
    @IsString()
    @IsOptional()
    public hostname?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters Jump Clients installers by the given fully qualified domain name.',
    })
    @IsString()
    @IsOptional()
    public fqdn?: string;

    @ApiProperty({ required: false, type: String, description: 'Filters Jump Clients installers by the given tag.' })
    @IsString()
    @IsOptional()
    public tag?: string;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Filters Jump Clients installers by the given jump group id.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public jumpGroupId?: number;

    @ApiProperty({
        required: false,
        enum: JumpClientGroupType,
        description: 'Filters Jump Clients installers by the given jump group type.',
    })
    @IsEnum(JumpClientGroupType)
    @IsOptional()
    public jumpGroupType?: JumpClientGroupType;

    @ApiProperty({
        required: false,
        enum: JumpClientConnectionType,
        description: 'Filters Jump Clients installers by the given connection type.',
    })
    @IsEnum(JumpClientConnectionType)
    @IsOptional()
    public connectionType?: JumpClientConnectionType;
}
