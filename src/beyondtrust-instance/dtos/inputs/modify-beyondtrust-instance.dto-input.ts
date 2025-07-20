import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ModifyBeyondtrustInstanceDtoInput {
    @ApiProperty({ required: false, type: String, description: 'The display name of the BeyondTrust instance.' })
    @IsOptional()
    @IsString()
    public name?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The client id to be authenticated by BeyondTrust system.',
    })
    @IsOptional()
    @IsString()
    public authClientId?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The client secret to be authenticated by BeyondTrust system.',
    })
    @IsOptional()
    @IsString()
    public authClientSecret?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The url to retrieve BeyondTrust OAuth2 token.',
    })
    @IsOptional()
    @IsString()
    public oauth2TokenUrl?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The base url of the BeyondTrust PRA Configuration API.',
    })
    @IsOptional()
    @IsString()
    public apiBaseUrl?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The url for the backup API of the BeyondTrust instance.',
    })
    @IsOptional()
    @IsString()
    public backupApiUrl?: string;
}
