import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class RetrieveJumpointsDtoInput {
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

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters results to include only Jumpoints with the given name.',
    })
    @IsString()
    @IsOptional()
    public name?: string;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'Filters results to include only Jumpoints with a node that has the specified public IP. Setting this property triggers a direct query to the BeyondTrust Privileged Remote Access system.',
    })
    @IsString()
    @IsOptional()
    public publicIp?: string;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'Filters results to include only Jumpoints with a node that has the specified private IP. Setting this property triggers a direct query to the BeyondTrust Privileged Remote Access system.',
    })
    @IsString()
    @IsOptional()
    public privateIp?: string;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'Filters results to include only Jumpoints with a node that has the specified hostname. Setting this property triggers a direct query to the BeyondTrust Privileged Remote Access system.',
    })
    @IsString()
    @IsOptional()
    public hostname?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters a response to include only resources with the given code name.',
    })
    @IsString()
    @IsOptional()
    public codeName?: string;
}
