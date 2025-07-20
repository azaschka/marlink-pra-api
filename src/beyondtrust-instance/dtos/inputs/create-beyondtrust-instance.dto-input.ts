import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBeyondtrustInstanceDtoInput {
    @ApiProperty({ required: true, type: String, description: 'The display name of the BeyondTrust instance.' })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The client id to be authenticated by BeyondTrust system.',
    })
    @IsNotEmpty()
    @IsString()
    public authClientId!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The client secret to be authenticated by BeyondTrust system.',
    })
    @IsNotEmpty()
    @IsString()
    public authClientSecret!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The url to retrieve BeyondTrust OAuth2 token.',
    })
    @IsNotEmpty()
    @IsString()
    public oauth2TokenUrl!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The base url of the BeyondTrust PRA Configuration API.',
    })
    @IsNotEmpty()
    @IsString()
    public apiBaseUrl!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The url for the backup API of the BeyondTrust instance.',
    })
    @IsNotEmpty()
    @IsString()
    public backupApiUrl!: string;
}
