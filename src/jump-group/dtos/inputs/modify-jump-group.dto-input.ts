import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ModifyJumpGroupDtoInput {
    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public name?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public codeName?: string;

    @ApiProperty({ required: false, type: String, nullable: true })
    @IsOptional()
    @IsString()
    public comments?: string | null;
}
