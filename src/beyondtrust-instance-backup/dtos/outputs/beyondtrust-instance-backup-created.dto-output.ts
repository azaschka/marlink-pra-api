import { ApiProperty } from '@nestjs/swagger';
import { BeyondtrustInstanceBackup } from '../../models';

export class BeyondtrustInstanceBackupCreatedDtoOutput implements BeyondtrustInstanceBackup {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the resource.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the BeyondTrust instance.',
    })
    public beyondtrustInstanceId!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The path to the backup file.',
    })
    public backupFilePath!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date and time when this backup was created.',
    })
    public creationDate!: Date;
}
