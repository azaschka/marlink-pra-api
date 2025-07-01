import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ModifySiteDtoInput {
    @ApiProperty({
        required: false,
        type: String,
        description: 'The key of the customer to which this site belongs.',
    })
    @IsOptional()
    @IsString()
    public customerKey?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The name of the customer to which this site belongs.',
    })
    @IsOptional()
    @IsString()
    public customerName?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The username of the user who will approve requests for this site.',
    })
    @IsOptional()
    @IsString()
    public approverUsername?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The email address of the user who will approve requests for this site.',
    })
    @IsOptional()
    @IsString()
    public approverEmail?: string;
}
