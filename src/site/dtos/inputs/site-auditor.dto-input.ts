import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class SiteAuditorDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The username of the site auditor.',
    })
    @IsNotEmpty()
    @IsString()
    public username!: string;

    @ApiProperty({ required: true, type: String, description: 'The email of the site auditor.' })
    @IsNotEmpty()
    @IsString()
    public email!: string;

    @ApiProperty({
        required: true,
        type: Boolean,
        description: 'Indicates if the user is an admin operator.',
    })
    @IsNotEmpty()
    @IsBoolean()
    public isAdminOperator!: boolean;
}
