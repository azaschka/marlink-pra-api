import { ApiProperty } from '@nestjs/swagger';
import { BeyondtrustInstance } from '../../models';

export class BeyondtrustInstanceRetrievedDtoOutput implements BeyondtrustInstance {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this BeyondTrust instance by the appliance.',
    })
    public id!: number;

    @ApiProperty({ required: true, type: String, description: 'The display name of the BeyondTrust instance.' })
    public name!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The client id to be authenticated by BeyondTrust system.',
    })
    public authClientId!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The client secret to be authenticated by BeyondTrust system.',
    })
    public authClientSecret!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The url to retrieve BeyondTrust OAuth2 token.',
    })
    public oauth2TokenUrl!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The base url of the BeyondTrust PRA Configuration API.',
    })
    public apiBaseUrl!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The url for the backup API of the BeyondTrust instance.',
    })
    public backupApiUrl!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date and time when this BeyondTrust instance was created.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The date and time when this BeyondTrust instance was last modified.',
    })
    public lastModificationDate?: Date;
}
