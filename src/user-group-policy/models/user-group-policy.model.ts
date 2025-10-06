import { GroupPolicy } from '../../group-policy/models';
import { User } from '../../user/models';

export interface UserGroupPolicy {
    userId: number;
    groupPolicyId: number;
    lastSyncDate: Date;
    user?: User;
    groupPolicy?: GroupPolicy;
}
