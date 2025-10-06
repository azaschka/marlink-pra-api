import { GroupPolicy } from '../../group-policy/models';
import { Jumpoint } from '../../jumpoint/models';

export interface GroupPolicyJumpoint {
    groupPolicyId: number;
    jumpointId: number;
    lastSyncDate: Date;
    groupPolicy?: GroupPolicy;
    jumpoint?: Jumpoint;
}
