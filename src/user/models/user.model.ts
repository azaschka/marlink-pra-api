import {
    UserAllowedAccessPermissionType,
    UserViewSupportReportsPermissionType,
    UserViewVaultReportsPermissionType,
} from '../enums';

export interface User {
    id: number;
    publicDisplayName: string;
    securityProviderId?: number;
    username?: string;
    passwordExpirationDate?: Date | null;
    email?: string;
    preferredEmailLanguage?: string;
    isTwoFactorAuthRequired?: boolean;
    isLoginAllowed?: boolean;
    lastAuthenticationDate?: Date;
    failedLoginAttempts?: number;
    mustResetPasswordOnNextLogin?: boolean;
    creationDate?: Date;
    hasTwoFactorAuthEnabled?: boolean;
    fido2CredentialCount?: number;
    fido2LastUsedDate?: Date;
    hasAdminPermission?: boolean;
    hasSetPasswordsPermission?: boolean;
    hasAdminPushagentPermission?: boolean;
    viewSupportReportsPermissionType?: UserViewSupportReportsPermissionType;
    viewVaultReportsPermissionType?: UserViewVaultReportsPermissionType;
    hasViewSyslogReportsPermission?: boolean;
    hasViewSdRecordingsPermission?: boolean;
    hasEditJumpGroupsPermission?: boolean;
    hasEditSdTeamsPermission?: boolean;
    hasEditCannedScriptsPermission?: boolean;
    hasEditCustomRepLinksPermission?: boolean;
    allowedAccessPermissionType?: UserAllowedAccessPermissionType;
    hasShareOtherTeamPermission?: boolean;
    hasInviteExternalUserPermission?: boolean;
    hasExtendedAvailabilityModeAllowedPermission?: boolean;
    hasEditExternalKeyPermission?: boolean;
    sessionInactivityTimeoutInSeconds?: number;
    hasCollaboratePermission?: boolean;
    hasCollaborateControlPermission?: boolean;
    hasJumpClientPermission?: boolean;
    hasLocalJumpPermission?: boolean;
    hasRemoteJumpPermission?: boolean;
    hasRemoteVncPermission?: boolean;
    hasRemoteRdpPermission?: boolean;
    hasShellJumpPermission?: boolean;
    defaultJumpItemRoleId?: number;
    privateJumpItemRoleId?: number;
    inferiorJumpItemRoleId?: number;
    unassignedJumpItemRoleId?: number;
    hasWebJumpPermission?: boolean;
    hasProtocolTunnelPermission?: boolean;
    hasSdStaticPortForExternalToolsPermission?: boolean;
    hasVaultPermission?: boolean;
    hasEndpointAutomationPermission?: boolean;
    lastSyncDate: Date;
}
