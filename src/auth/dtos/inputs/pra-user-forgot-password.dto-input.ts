import { IsEmail } from 'class-validator';

export class PraUserForgotPasswordDtoInput {
    @IsEmail()
    public email!: string;
}
