import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { AccessScopeDtoInput } from './access-scope.dto-input';

export class CreateAccessDtoInput {
    @ApiProperty({ required: true, type: String, description: 'The key of the access.' })
    @IsNotEmpty()
    @IsString()
    public key!: string;

    @ApiProperty({ required: true, type: String, description: 'The name of the access.' })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({ required: true, type: AccessScopeDtoInput, description: 'The access.' })
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => AccessScopeDtoInput)
    public value!: AccessScopeDtoInput;
}
