import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { DiscrepancySyncType } from '../../enums';

export class SyncDiscrepancyDtoInput {
    @ApiProperty({
        required: true,
        description: 'The type of synchronization to perform.',
        enum: DiscrepancySyncType,
    })
    @IsEnum(DiscrepancySyncType)
    @IsNotEmpty()
    public syncType!: DiscrepancySyncType;
}
