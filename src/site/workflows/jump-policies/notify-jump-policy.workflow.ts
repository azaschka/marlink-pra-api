import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import {
    CreateJumpPolicyCommand,
    DeleteJumpPolicyCommand,
    ModifyJumpPolicyCommand,
} from '../../../jump-policy/commands';
import { JumpPolicy } from '../../../jump-policy/models';
import { RetrieveJumpPoliciesQuery } from '../../../jump-policy/queries';
import { BaseWorkflow } from '../../../shared/workflows';
import { PartialSiteManager } from '../../models';

export class NotifyJumpPolicyWorkflow implements BaseWorkflow<JumpPolicy> {
    private static readonly HAS_SCHEDULED_ACCESS_RESTRICTION = false;
    private static readonly IS_SESSION_START_NOTIFICATION_ENABLED = true;
    private static readonly IS_SESSION_END_NOTIFICATION_ENABLED = true;
    private static readonly APPROVAL_MAX_DURATION_IN_MINUTES = 240;

    private get jumpPolicyDisplayName(): string {
        return `${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}${this.appConfigService.site.jumpPolicy.notifySuffix}`;
    }

    private get jumpPolicyCodeName(): string {
        return this.jumpPolicyDisplayName.toLowerCase();
    }

    private get jumpPolicyNotificationDisplayName(): string {
        return `${this.appConfigService.site.jumpPolicy.notificationDisplayNamePrefix} ${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly siteManagers: PartialSiteManager[],
        private readonly customerName: string,
        private readonly customerBeyondtrustInstanceId: number,
    ) {}

    public async getOrCreate(): Promise<JumpPolicy> {
        const jumpPolicy = await this.getOrModify();

        if (jumpPolicy) {
            return jumpPolicy;
        }

        return await this.commandBus.execute<CreateJumpPolicyCommand, JumpPolicy>(
            new CreateJumpPolicyCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                this.jumpPolicyDisplayName, // displayName
                this.jumpPolicyCodeName, // codeName
                undefined, // description
                NotifyJumpPolicyWorkflow.HAS_SCHEDULED_ACCESS_RESTRICTION, // hasScheduledAccessRestriction
                undefined, // simultaneousJumpsType
                undefined, // doesSimultaneousJumpBehaviorApplyToCopies
                undefined, // simultaneousJumpsRdpType
                undefined, // shouldForceRemoveUsersWhenScheduleDisallows
                undefined, // isTicketIdRequired
                undefined, // isTwoFactorChallengeRequired
                NotifyJumpPolicyWorkflow.IS_SESSION_START_NOTIFICATION_ENABLED, // isSessionStartNotificationEnabled
                NotifyJumpPolicyWorkflow.IS_SESSION_END_NOTIFICATION_ENABLED, // isSessionEndNotificationEnabled
                this.siteManagers.map((siteManager) => siteManager.email), // notificationEmailAddresses
                this.jumpPolicyNotificationDisplayName, // notificationDisplayName
                undefined, // notificationEmailLanguage
                undefined, // isApprovalRequired
                NotifyJumpPolicyWorkflow.APPROVAL_MAX_DURATION_IN_MINUTES, // approvalMaxDurationInMinutes
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
            new DeleteJumpPolicyCommand(this.transactionId, this.customerBeyondtrustInstanceId, jumpPolicy.id),
        );
    }

    private async getOrModify(): Promise<JumpPolicy | null> {
        const jumpPolicy = await this.get();

        if (!jumpPolicy) {
            return null;
        }

        if (
            jumpPolicy.displayName !== this.jumpPolicyDisplayName ||
            jumpPolicy.hasScheduledAccessRestriction !== NotifyJumpPolicyWorkflow.HAS_SCHEDULED_ACCESS_RESTRICTION ||
            jumpPolicy.isSessionStartNotificationEnabled !==
                NotifyJumpPolicyWorkflow.IS_SESSION_START_NOTIFICATION_ENABLED ||
            jumpPolicy.isSessionEndNotificationEnabled !==
                NotifyJumpPolicyWorkflow.IS_SESSION_END_NOTIFICATION_ENABLED ||
            JSON.stringify(jumpPolicy.notificationEmailAddresses ?? []) !==
                JSON.stringify(this.siteManagers.map((siteManager) => siteManager.email)) ||
            jumpPolicy.notificationDisplayName !== this.jumpPolicyNotificationDisplayName ||
            jumpPolicy.approvalMaxDurationInMinutes !== NotifyJumpPolicyWorkflow.APPROVAL_MAX_DURATION_IN_MINUTES
        ) {
            return await this.commandBus.execute<ModifyJumpPolicyCommand, JumpPolicy>(
                new ModifyJumpPolicyCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    jumpPolicy.id,
                    this.jumpPolicyDisplayName, // displayName
                    undefined, // codeName
                    undefined, // description
                    NotifyJumpPolicyWorkflow.HAS_SCHEDULED_ACCESS_RESTRICTION, // hasScheduledAccessRestriction
                    undefined, // simultaneousJumpsType
                    undefined, // doesSimultaneousJumpBehaviorApplyToCopies
                    undefined, // simultaneousJumpsRdpType
                    undefined, // shouldForceRemoveUsersWhenScheduleDisallows
                    undefined, // isTicketIdRequired
                    undefined, // isTwoFactorChallengeRequired
                    NotifyJumpPolicyWorkflow.IS_SESSION_START_NOTIFICATION_ENABLED, // isSessionStartNotificationEnabled
                    NotifyJumpPolicyWorkflow.IS_SESSION_END_NOTIFICATION_ENABLED, // isSessionEndNotificationEnabled
                    this.siteManagers.map((siteManager) => siteManager.email), // notificationEmailAddresses
                    this.jumpPolicyNotificationDisplayName, // notificationDisplayName
                    undefined, // notificationEmailLanguage
                    undefined, // isApprovalRequired
                    NotifyJumpPolicyWorkflow.APPROVAL_MAX_DURATION_IN_MINUTES, // approvalMaxDurationInMinutes
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

        return jumpPolicy;
    }

    private async get(): Promise<JumpPolicy | null> {
        const jumpPolicies = await this.queryBus.execute<RetrieveJumpPoliciesQuery, JumpPolicy[]>(
            new RetrieveJumpPoliciesQuery(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                1,
                1,
                this.jumpPolicyCodeName,
            ),
        );

        return jumpPolicies[0] ?? null;
    }
}
