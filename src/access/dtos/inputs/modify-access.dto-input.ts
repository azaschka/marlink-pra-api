import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { AccessScopeDtoInput } from './access-scope.dto-input';

export class ModifyAccessDtoInput {
    @ApiProperty({ required: false, type: String, description: 'The key of the access.' })
    @IsOptional()
    @IsString()
    public key?: string;

    @ApiProperty({ required: false, type: String, description: 'The name of the access.' })
    @IsOptional()
    @IsString()
    public name?: string;

    @ApiProperty({ required: false, type: AccessScopeDtoInput, description: 'The access.' })
    @IsOptional()
    @ValidateNested()
    @Type(() => AccessScopeDtoInput)
    public value?: AccessScopeDtoInput;
}
