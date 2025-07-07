import {
    ApprovalApproverScopeType,
    ApprovalScopeType,
    SimultaneousJumpsRdpType,
    SimultaneousJumpsType,
} from '../enums';

export class CreateJumpPolicyCommand {
    public readonly commandType = 'create-jump-policy';

    constructor(
        public readonly transactionId: string,
        public readonly displayName: string,
        public readonly codeName?: string,
        public readonly description?: string,
        public readonly hasScheduledAccessRestriction?: boolean,
        public readonly simultaneousJumpsType?: SimultaneousJumpsType,
        public readonly doesSimultaneousJumpBehaviorApplyToCopies?: boolean,
        public readonly simultaneousJumpsRdpType?: SimultaneousJumpsRdpType,
        public readonly shouldForceRemoveUsersWhenScheduleDisallows?: boolean,
        public readonly isTicketIdRequired?: boolean,
        public readonly isTwoFactorChallengeRequired?: boolean,
        public readonly isSessionStartNotificationEnabled?: boolean,
        public readonly isSessionEndNotificationEnabled?: boolean,
        public readonly notificationEmailAddresses?: string[],
        public readonly notificationDisplayName?: string,
        public readonly notificationEmailLanguage?: string,
        public readonly isApprovalRequired?: boolean,
        public readonly approvalMaxDurationInMinutes?: number,
        public readonly approvalScopeType?: ApprovalScopeType,
        public readonly approvalEmailAddresses?: string[],
        public readonly approvalUserIds?: string[],
        public readonly approvalTeamIds?: string[],
        public readonly approvalDisplayName?: string,
        public readonly approvalEmailLanguage?: string,
        public readonly approvalApproverScopeType?: ApprovalApproverScopeType,
        public readonly isRecordingsDisabled?: boolean,
    ) {}
}
