import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateJumpPolicyCommand, DeleteJumpPolicyCommand } from '../../jump-policy/commands';
import { JumpPolicy } from '../../jump-policy/models';
import { RetrieveJumpPoliciesQuery } from '../../jump-policy/queries';
import { BaseWorkflow } from '../../shared/workflows';
import { SiteApprover } from '../models';

export class NotifyJumpPolicyWorkflow implements BaseWorkflow<JumpPolicy> {
    private get jumpPolicyDisplayName(): string {
        return `${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}${this.appConfigService.site.jumpPolicy.notifySuffix}`;
    }

    private get jumpPolicyCodeName(): string {
        return this.jumpPolicyDisplayName.toLowerCase();
    }

    private get jumpPolicyNotificationDisplayName(): string {
        return `${this.appConfigService.site.jumpPolicy.notificationDisplayNamePrefix}${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly siteApprovers: SiteApprover[],
        private readonly customerName: string,
    ) {}

    public async getOrCreate(): Promise<JumpPolicy> {
        const jumpPolicy = await this.get();

        if (jumpPolicy) {
            return jumpPolicy;
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
                undefined, // isApprovalRequired
                240, // approvalMaxDurationInMinutes
                undefined, // approvalScopeType
                undefined, // approvalEmailAddresses
                undefined, // approvalUserIds
                undefined, // approvalTeamIds
                undefined, // approvalDisplayName
                undefined, // approvalEmailLanguage
                undefined, // approvalApproverScopeType
                undefined, // isRecordingsDisabled
            ),
        );
    }

    public async delete(): Promise<void> {
        const jumpPolicy = await this.get();

        if (!jumpPolicy) {
            return;
        }

        await this.commandBus.execute<DeleteJumpPolicyCommand, void>(
            new DeleteJumpPolicyCommand(this.transactionId, jumpPolicy.id),
        );
    }

    private async get(): Promise<JumpPolicy | null> {
        const jumpPolicies = await this.queryBus.execute<RetrieveJumpPoliciesQuery, JumpPolicy[]>(
            new RetrieveJumpPoliciesQuery(this.transactionId, 1, 1, this.jumpPolicyCodeName),
        );

        return jumpPolicies[0] ?? null;
    }
}
