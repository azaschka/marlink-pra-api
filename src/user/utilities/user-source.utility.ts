import { UserSourceType } from '../enums';

interface SecurityProviderAware {
    securityProviderId?: number | null;
}

export abstract class UserSourceUtility {
    /**
     * Classifies a BeyondTrust account as local or externally provisioned.
     *
     * The security provider is the only signal BeyondTrust gives us. A user without one is local. Whether
     * BeyondTrust also reports a provider for local accounts, and with which id, is not verified yet, so the
     * ids of local providers are configurable: once known, they go into USER_LOCAL_SECURITY_PROVIDER_IDS and
     * this classification is correct without a code change.
     */
    public static resolveSourceType(user: SecurityProviderAware, localSecurityProviderIds: number[]): UserSourceType {
        if (user.securityProviderId === undefined || user.securityProviderId === null) {
            return UserSourceType.Internal;
        }

        return localSecurityProviderIds.includes(user.securityProviderId)
            ? UserSourceType.Internal
            : UserSourceType.External;
    }

    public static isExternal(user: SecurityProviderAware, localSecurityProviderIds: number[]): boolean {
        return UserSourceUtility.resolveSourceType(user, localSecurityProviderIds) === UserSourceType.External;
    }
}
