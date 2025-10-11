import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessUnit, UserRole } from 'src/auth/enums';

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
    @IsEnum(UserRole)
    public role?: UserRole;

    @IsOptional()
    @IsString()
    public displayName?: string;

    @IsOptional()
    @IsEnum(BusinessUnit)
    public businessUnit?: BusinessUnit;

    @IsOptional()
    @IsBoolean()
    public canManagePraUsers?: boolean;

    @IsOptional()
    @IsBoolean()
    public regeneratePassword?: boolean;
}
