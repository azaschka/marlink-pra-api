import { ApiProperty } from '@nestjs/swagger';
import {
    UserSourceType,
    UserAllowedAccessPermissionType,
    UserEndpointAutomationPermissionType,
    UserViewSupportReportsPermissionType,
    UserViewVaultReportsPermissionType,
} from '../../enums';
import { User } from '../../models';
import { UserSourceUtility } from '../../utilities';

export class UserRetrievedDtoOutput implements User {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this user by the appliance.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: String,
        description:
            "The user's public display name. This attribute is read-only for users who belong to a security provider that synchronizes display names.",
    })
    public publicDisplayName!: string;

    @ApiProperty({
        required: false,
        type: Number,
        description:
            'The unique identifier of the security provider through which this user authenticates. This attribute is read-only.',
    })
    public securityProviderId?: number;

    @ApiProperty({
        required: true,
        enum: UserSourceType,
        description:
            'Whether the account is local or provisioned by an external identity provider. Derived from the ' +
            'security provider: several properties are read-only on a non-local account, and BeyondTrust creates a ' +
            'deleted non-local account again at the next login through the identity provider.',
    })
    public sourceType!: UserSourceType;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The username the user last used to log in. This attribute is read-only for non-local users.',
    })
    public username?: string;

    @ApiProperty({
        required: false,
        type: Date,
        nullable: true,
        description:
            "The date and time at which the local user's password will expire as an RFC3339 date-time string. This attribute is only returned for local users and can only be updated on local users. If not set or set to a null or empty value, then the local user's password never expires.",
    })
    public passwordExpirationDate?: Date | null;

    @ApiProperty({
        required: false,
        type: String,
        description:
            "The user's email address. This attribute is read-only for users who belong to a security provider that synchronizes email addresses.",
    })
    public email?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Must be the locale code for one of the locales listed.',
    })
    public preferredEmailLanguage?: string;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, this user must use two factor authentication via a TOTP application. If false, this user may opt-in to using two-factor authentication via a TOTP application. There is no way to prevent a user from opting in to two-factor authentication. This attribute is only available for local and LDAP users.',
    })
    public isTwoFactorAuthRequired?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, this user is allowed to log in.',
    })
    public isLoginAllowed?: boolean;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last date/time at which the user authenticated. This attribute is read-only.',
    })
    public lastAuthenticationDate?: Date;

    @ApiProperty({
        required: false,
        type: Number,
        description:
            'The number of times this local user has failed to authenticate. This attribute is only returned for local users and can only be updated on local users. It is always 0 for new local users, so it is ignored in POST requests. You may set it to 0 in PATCH requests to unlock an account that has too many failed logins.',
    })
    public failedLoginAttempts?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            "If true, this local user's password must be reset on their next login. This attribute is only returned for local users and can only be set on local users.",
    })
    public mustResetPasswordOnNextLogin?: boolean;

    @ApiProperty({
        required: false,
        type: Date,
        description:
            'The date/time at which this user resource was created. For non-local users, this time represents the time at which the user resource was added in Privileged Remote Access. It does not represent the time at which the user account was created in an external user store, such as an LDAP server.',
    })
    public creationDate?: Date;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, this user has enabled two factor authentication.',
    })
    public hasTwoFactorAuthEnabled?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'The number of FIDO2 credentials registered for this user.',
    })
    public fido2CredentialCount?: number;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The date and time at which the user last used a FIDO2 credential to authenticate.',
    })
    public fido2LastUsedDate?: Date;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has admin permissions.',
    })
    public hasAdminPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to set passwords.',
    })
    public hasSetPasswordsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to edit jumpoints.',
    })
    public hasAdminPushagentPermission?: boolean;

    @ApiProperty({
        required: false,
        enum: UserViewSupportReportsPermissionType,
        description: 'Session Reporting Permissions.',
    })
    public viewSupportReportsPermissionType?: UserViewSupportReportsPermissionType;

    @ApiProperty({
        required: false,
        enum: UserViewVaultReportsPermissionType,
        description: 'The type of vault reports permission for the user.',
    })
    public viewVaultReportsPermissionType?: UserViewVaultReportsPermissionType;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to view syslog reports.',
    })
    public hasViewSyslogReportsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to view session recordings.',
    })
    public hasViewSdRecordingsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to edit jump groups.',
    })
    public hasEditJumpGroupsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to edit teams.',
    })
    public hasEditSdTeamsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to edit canned scripts.',
    })
    public hasEditCannedScriptsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to edit custom links.',
    })
    public hasEditCustomRepLinksPermission?: boolean;

    @ApiProperty({
        required: false,
        enum: UserAllowedAccessPermissionType,
        description: 'Allowed to access endpoints.',
    })
    public allowedAccessPermissionType?: UserAllowedAccessPermissionType;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to share sessions with teams which they do not belong to.',
    })
    public hasShareOtherTeamPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to invite external users.',
    })
    public hasInviteExternalUserPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to enable extended availability mode.',
    })
    public hasExtendedAvailabilityModeAllowedPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the user has permission to edit external keys.',
    })
    public hasEditExternalKeyPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description: `Remove User from the session after they've been inactive for a certain number of seconds. Allowed values are -1, 0, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 43200, and 86400. -1 means "Use site wide setting". 0 means "No timeout".`,
    })
    public sessionInactivityTimeoutInSeconds?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to show screen to other Users.',
    })
    public hasCollaboratePermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to give control when showing screen to other Users.',
    })
    public hasCollaborateControlPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Jump Clients.',
    })
    public hasJumpClientPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Local Jump (Windows only).',
    })
    public hasLocalJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote Jump.',
    })
    public hasRemoteJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote VNC.',
    })
    public hasRemoteVncPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote RDP.',
    })
    public hasRemoteRdpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Shell Jump.',
    })
    public hasShellJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Default Jump Item Role.',
    })
    public defaultJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Personal Jump Item Role.',
    })
    public privateJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Teams Jump Item Role.',
    })
    public inferiorJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'System Jump Item Role.',
    })
    public unassignedJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Web Jump.',
    })
    public hasWebJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Protocol Tunnel Jump.',
    })
    public hasProtocolTunnelPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use static port and username for external tool sessions.',
    })
    public hasSdStaticPortForExternalToolsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to Administer Vault.',
    })
    public hasVaultPermission?: boolean;

    @ApiProperty({
        required: false,
        enum: UserEndpointAutomationPermissionType,
        description: 'Allowed to Administer Endpoint Automation.',
    })
    public endpointAutomationPermissionType?: UserEndpointAutomationPermissionType;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date which the user was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;

    public static create(user: User, localSecurityProviderIds: number[]): UserRetrievedDtoOutput {
        return {
            ...user,
            sourceType: UserSourceUtility.resolveSourceType(user, localSecurityProviderIds),
        };
    }
}
