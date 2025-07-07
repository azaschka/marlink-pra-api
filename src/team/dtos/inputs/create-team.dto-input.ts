import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTeamDtoInput {
    @ApiProperty({ required: true, type: String, description: 'The display name of the team.' })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The code name of a resource. This value must be unique.',
    })
    @IsOptional()
    @IsString()
    public codeName?: string;

    @ApiProperty({ required: false, type: String, nullable: true, description: 'The team comments.' })
    @IsOptional()
    @IsString()
    public comments?: string | null;
}
