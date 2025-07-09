export interface GroupPolicyMember {
    groupPolicyId: number;
    memberId: number;
    userId: number;
    securityProviderId: number;
    distinguishedName?: string;
    groupName?: string;
    lastSyncDate: Date;
}
