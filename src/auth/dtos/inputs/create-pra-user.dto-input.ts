import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BusinessUnit, UserRole } from 'src/auth/enums';

export class CreatePraUserDtoInput {
    @IsNotEmpty()
    @IsString()
    public username!: string;

    @IsOptional()
    @IsString()
    public password?: string;

    @IsNotEmpty()
    @IsEmail()
    public email!: string;

    @IsNotEmpty()
    @IsEnum(UserRole)
    public role!: UserRole;

    @IsNotEmpty()
    @IsString()
    public displayName!: string;

    @IsOptional()
    @IsEnum(BusinessUnit)
    public businessUnit?: BusinessUnit;

    @IsOptional()
    @IsBoolean()
    public canManagePraUsers?: boolean;
}
