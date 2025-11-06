import { GroupPolicy } from '../../group-policy/models';
import { JumpGroup } from '../../jump-group/models';

export interface GroupPolicyJumpGroup {
    groupPolicyId: number;
    jumpGroupId: number;
    jumpItemRoleId?: number;
    jumpPolicyId?: number;
    lastSyncDate: Date;
    groupPolicy?: GroupPolicy;
    jumpGroup?: JumpGroup;
}
