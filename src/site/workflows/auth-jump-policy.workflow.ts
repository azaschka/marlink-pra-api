import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateJumpPolicyCommand } from '../../jump-policy/commands';
import { JumpPolicy } from '../../jump-policy/models';
import { RetrieveJumpPoliciesQuery } from '../../jump-policy/queries';
import { BaseWorkflow } from '../../shared/workflows';
import { SiteApprover } from '../models';

export class AuthJumpPolicyWorkflow implements BaseWorkflow<JumpPolicy> {
    private get jumpPolicyDisplayName(): string {
        return `${this.appConfigService.site.jumpPolicy.prefix}${this.siteName.toUpperCase()}${this.appConfigService.site.jumpPolicy.authSuffix}`;
    }

    private get jumpPolicyCodeName(): string {
        return this.jumpPolicyDisplayName.toLowerCase();
    }

    private get jumpPolicyNotificationDisplayName(): string {
        return `${this.appConfigService.site.jumpPolicy.notificationDisplayNamePrefix}${this.siteName.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteApprovers: SiteApprover[],
    ) {}

    public async getOrCreate(): Promise<JumpPolicy> {
        const jumpPolicies = await this.queryBus.execute<RetrieveJumpPoliciesQuery, JumpPolicy[]>(
            new RetrieveJumpPoliciesQuery(this.transactionId, 1, 1, this.jumpPolicyCodeName),
        );

        if (jumpPolicies.length > 0 && jumpPolicies[0]) {
            return jumpPolicies[0];
        }

        return await this.commandBus.execute<CreateJumpPolicyCommand, JumpPolicy>(
            new CreateJumpPolicyCommand(
                this.transactionId,
                this.jumpPolicyDisplayName, // displayName
                this.jumpPolicyCodeName, // codeName
                undefined, // description
                false, // hasScheduledAccessRestriction
                undefined, // simultaneousJumpsType
                undefined, // doesSimultaneousJumpBehaviorApplyToCopies
                undefined, // simultaneousJumpsRdpType
                undefined, // shouldForceRemoveUsersWhenScheduleDisallows
                undefined, // isTicketIdRequired
                undefined, // isTwoFactorChallengeRequired
                true, // isSessionStartNotificationEnabled
                true, // isSessionEndNotificationEnabled
                this.siteApprovers.map((approver) => approver.email), // notificationEmailAddresses
                this.jumpPolicyNotificationDisplayName, // notificationDisplayName
                undefined, // notificationEmailLanguage
                true, // isApprovalRequired
                240, // approvalMaxDurationInMinutes
                undefined, // approvalScopeType
                this.siteApprovers.map((approver) => approver.email), // approvalEmailAddresses
                undefined, // approvalUserIds
                undefined, // approvalTeamIds
                undefined, // approvalDisplayName
                undefined, // approvalEmailLanguage
                undefined, // approvalApproverScopeType
                undefined, // isRecordingsDisabled
            ),
        );
    }
}
