import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SiteManagerDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The username of the site manager.',
    })
    @IsNotEmpty()
    @IsString()
    public username!: string;

    @ApiProperty({ required: true, type: String, description: 'The email of the site manager.' })
    @IsNotEmpty()
    @IsString()
    public email!: string;
}
