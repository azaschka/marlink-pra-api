import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserForgotPasswordDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: "The user's email address. This is used to send the password reset link.",
    })
    @IsNotEmpty()
    @IsString()
    public email!: string;
}
