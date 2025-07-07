import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreatePraUserDtoInput {
    @IsNotEmpty()
    @IsString()
    public username!: string;

    @IsNotEmpty()
    @IsString()
    public password!: string;

    @IsNotEmpty()
    @IsEmail()
    public email!: string;

    @IsNotEmpty()
    @IsEnum(['Super Admin', 'Admin', 'Data Center Engineer'])
    public role!: string;

    @IsNotEmpty()
    @IsString()
    public displayName!: string;
}
