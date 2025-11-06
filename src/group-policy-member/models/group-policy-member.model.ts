import { GroupPolicy } from '../../group-policy/models';
import { User } from '../../user/models';

export interface GroupPolicyMember {
    groupPolicyId: number;
    memberId: number;
    userId: number;
    securityProviderId: number;
    distinguishedName?: string;
    groupName?: string;
    lastSyncDate: Date;
    groupPolicy?: GroupPolicy;
    user?: User;
}
