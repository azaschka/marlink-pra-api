import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserSourceType } from '../../enums';

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

    @ApiProperty({
        required: true,
        enum: UserSourceType,
        description: 'The source type of the site manager.',
        default: UserSourceType.Internal,
    })
    @IsEnum(UserSourceType)
    public sourceType: UserSourceType = UserSourceType.Internal;
}
