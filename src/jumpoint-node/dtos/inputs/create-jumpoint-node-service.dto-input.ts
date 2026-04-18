import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { JumpointNodeServiceType } from '../../enums';

export class CreateJumpointNodeServiceDtoInput {
    @ApiProperty({
        enum: JumpointNodeServiceType,
        required: true,
        description: 'The type of the service.',
    })
    @IsEnum(JumpointNodeServiceType)
    @IsNotEmpty()
    public serviceType!: JumpointNodeServiceType;
}
