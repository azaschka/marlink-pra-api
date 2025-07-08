import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class ModifyPraUserDtoInput {
    @IsOptional()
    @IsString()
    public username?: string;

    @IsOptional()
    @IsString()
    public password?: string;

    @IsOptional()
    @IsEmail()
    public email?: string;

    @IsOptional()
    @IsEnum(['Super Admin', 'Admin', 'Data Center Engineer'])
    public role?: string;

    @IsOptional()
    @IsString()
    public displayName?: string;
}
