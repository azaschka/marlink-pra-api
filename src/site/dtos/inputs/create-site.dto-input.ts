import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSiteDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The unique key of the site.',
    })
    @IsNotEmpty()
    @IsString()
    public key!: string;

    @ApiProperty({ required: true, type: String, description: 'The name of the site.' })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The key of the customer to which this site belongs.',
    })
    @IsNotEmpty()
    @IsString()
    public customerKey!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The username of the user who will approve requests for this site.',
    })
    @IsNotEmpty()
    @IsString()
    public approverUsername!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The email address of the user who will approve requests for this site.',
    })
    @IsNotEmpty()
    @IsString()
    public approverEmail!: string;
}
