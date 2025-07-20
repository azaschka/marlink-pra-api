import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBeyondtrustInstanceBackupDtoInput {
    @ApiProperty({ required: false, type: String, description: 'The password for the backup.' })
    @IsOptional()
    @IsString()
    public password?: string;
}
