import { JumpGroup } from '../../../jump-group/models';
import { JumpPolicy } from '../../../jump-policy/models';
import { Jumpoint } from '../../../jumpoint/models';
import { JumpGroupType, WebJumpUsernameFormatType } from '../enums';

export interface WebJump {
    id: number;
    name: string;
    jumpointId: number;
    url: string;
    jumpGroupId: number;
    jumpGroupType?: JumpGroupType;
    usernameFormatType?: WebJumpUsernameFormatType;
    mustVerifyCertificate?: boolean;
    authenticationTimeoutInSeconds?: number;
    tag?: string;
    comments?: string;
    jumpPolicyId?: number | null;
    usernameField?: string | null;
    passwordField?: string | null;
    submitField?: string | null;
    sessionPolicyId?: number | null;
    lastSyncDate: Date;
    jumpoint?: Jumpoint;
    jumpGroup?: JumpGroup;
    jumpPolicy?: JumpPolicy | null;
}
