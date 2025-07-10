import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { SiteApprover } from '../../models';

export class SiteApproverDtoInput implements SiteApprover {
    @ApiProperty({
        required: true,
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    public username!: string;

    @ApiProperty({
        required: true,
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    public email!: string;
}
