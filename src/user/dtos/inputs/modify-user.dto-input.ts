import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class ModifyUserDtoInput {
    @ApiProperty({
        required: false,
        type: String,
        description:
            "The user's public display name. This attribute is read-only for users who belong to a security provider that synchronizes display names.",
    })
    @IsOptional()
    @IsString()
    public publicDisplayName?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The username the user last used to log in. This attribute is read-only for non-local users.',
    })
    @IsOptional()
    @IsString()
    public username?: string;

    @ApiProperty({
        required: false,
        type: String,
        description:
            "The local user's password. This attribute is write-only for local users. It cannot be set in non-local user PATCH requests. It is not returned in GET requests.",
    })
    @IsOptional()
    @IsString()
    public password?: string;

    @ApiProperty({
        required: false,
        type: Date,
        nullable: true,
        description:
            "The date and time at which the local user's password will expire as an RFC3339 date-time string. This attribute is only returned for local users and can only be updated on local users. If not set or set to a null or empty value, then the local user's password never expires.",
    })
    @IsOptional()
    @Type(() => Date)
    public passwordExpirationDate?: Date | null;

    @ApiProperty({
        required: false,
        type: String,
        description:
            "The user's email address. This attribute is read-only for users who belong to a security provider that synchronizes email addresses.",
    })
    @IsOptional()
    @IsString()
    public email?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Must be the locale code for one of the locales listed.',
    })
    @IsOptional()
    @IsString()
    public preferredEmailLanguage?: string;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, this user must use two factor authentication via a TOTP application. If false, this user may opt-in to using two-factor authentication via a TOTP application. There is no way to prevent a user from opting in to two-factor authentication. This attribute is only available for local and LDAP users.',
    })
    @IsOptional()
    @IsBoolean()
    public isTwoFactorAuthRequired?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'True if this user is allowed to log in.',
    })
    @IsOptional()
    @IsBoolean()
    public isLoginAllowed?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description:
            'The number of times this local user has failed to authenticate. This attribute is only returned for local users and can only be updated on local users. It is always 0 for new local users, so it is ignored in POST requests. You may set it to 0 in PATCH requests to unlock an account that has too many failed logins.',
    })
    @IsOptional()
    @IsInt()
    public failedLoginAttempts?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            "If true, this local user's password must be reset on their next login. This attribute is only returned for local users and can only be set on local users.",
    })
    @IsOptional()
    @IsBoolean()
    public mustResetPasswordOnNextLogin?: boolean;
}
