import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import {
    CreateJumpPolicyCommand,
    DeleteJumpPolicyCommand,
    ModifyJumpPolicyCommand,
} from '../../../jump-policy/commands';
import { JumpPolicy } from '../../../jump-policy/models';
import { RetrieveJumpPoliciesQuery } from '../../../jump-policy/queries';
import { ObjectUtility } from '../../../shared/utilities';
import { BaseWorkflow } from '../../../shared/workflows';
import { PartialSiteApprover } from '../../models';

export class AuthJumpPolicyWorkflow implements BaseWorkflow<JumpPolicy> {
    private static readonly HAS_SCHEDULED_ACCESS_RESTRICTION = false;
    private static readonly IS_SESSION_START_NOTIFICATION_ENABLED = true;
    private static readonly IS_SESSION_END_NOTIFICATION_ENABLED = true;
    private static readonly IS_APPROVAL_REQUIRED = true;
    private static readonly APPROVAL_MAX_DURATION_IN_MINUTES = 240;

    private get jumpPolicyDisplayName(): string {
        return `${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}${this.appConfigService.site.jumpPolicy.authSuffix}`;
    }

    private get jumpPolicyCodeName(): string {
        return this.jumpPolicyDisplayName.toLowerCase();
    }

    private get jumpPolicyNotificationDisplayName(): string {
        return `${this.appConfigService.site.jumpPolicy.notificationDisplayNamePrefix} ${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}`;
    }

    private get jumpPolicyApprovalDisplayName(): string {
        return `${this.appConfigService.site.jumpPolicy.approvalDisplayNamePrefix} ${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly siteApprovers: PartialSiteApprover[],
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
                AuthJumpPolicyWorkflow.HAS_SCHEDULED_ACCESS_RESTRICTION, // hasScheduledAccessRestriction
                undefined, // simultaneousJumpsType
                undefined, // doesSimultaneousJumpBehaviorApplyToCopies
                undefined, // simultaneousJumpsRdpType
                undefined, // shouldForceRemoveUsersWhenScheduleDisallows
                undefined, // isTicketIdRequired
                undefined, // isTwoFactorChallengeRequired
                AuthJumpPolicyWorkflow.IS_SESSION_START_NOTIFICATION_ENABLED, // isSessionStartNotificationEnabled
                AuthJumpPolicyWorkflow.IS_SESSION_END_NOTIFICATION_ENABLED, // isSessionEndNotificationEnabled
                this.generateApprovalEmailAddresses(), // notificationEmailAddresses (use approver emails as fallback until managers add theirs)
                this.jumpPolicyNotificationDisplayName, // notificationDisplayName
                undefined, // notificationEmailLanguage
                AuthJumpPolicyWorkflow.IS_APPROVAL_REQUIRED, // isApprovalRequired
                AuthJumpPolicyWorkflow.APPROVAL_MAX_DURATION_IN_MINUTES, // approvalMaxDurationInMinutes
                undefined, // approvalScopeType
                this.generateApprovalEmailAddresses(), // approvalEmailAddresses (site approvers only)
                [], // approvalUserIds (will be populated by SiteManagerWorkflow)
                undefined, // approvalTeamIds
                this.jumpPolicyApprovalDisplayName, // approvalDisplayName
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
            jumpPolicy.hasScheduledAccessRestriction !== AuthJumpPolicyWorkflow.HAS_SCHEDULED_ACCESS_RESTRICTION ||
            jumpPolicy.isSessionStartNotificationEnabled !==
                AuthJumpPolicyWorkflow.IS_SESSION_START_NOTIFICATION_ENABLED ||
            jumpPolicy.isSessionEndNotificationEnabled !== AuthJumpPolicyWorkflow.IS_SESSION_END_NOTIFICATION_ENABLED ||
            jumpPolicy.notificationDisplayName !== this.jumpPolicyNotificationDisplayName ||
            jumpPolicy.isApprovalRequired !== AuthJumpPolicyWorkflow.IS_APPROVAL_REQUIRED ||
            jumpPolicy.approvalMaxDurationInMinutes !== AuthJumpPolicyWorkflow.APPROVAL_MAX_DURATION_IN_MINUTES ||
            JSON.stringify(jumpPolicy.approvalEmailAddresses ?? []) !==
                JSON.stringify(this.generateApprovalEmailAddresses()) ||
            jumpPolicy.approvalDisplayName !== this.jumpPolicyApprovalDisplayName
        ) {
            return await this.commandBus.execute<ModifyJumpPolicyCommand, JumpPolicy>(
                new ModifyJumpPolicyCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    jumpPolicy.id,
                    this.jumpPolicyDisplayName, // displayName
                    undefined, // codeName
                    undefined, // description
                    AuthJumpPolicyWorkflow.HAS_SCHEDULED_ACCESS_RESTRICTION, // hasScheduledAccessRestriction
                    undefined, // simultaneousJumpsType
                    undefined, // doesSimultaneousJumpBehaviorApplyToCopies
                    undefined, // simultaneousJumpsRdpType
                    undefined, // shouldForceRemoveUsersWhenScheduleDisallows
                    undefined, // isTicketIdRequired
                    undefined, // isTwoFactorChallengeRequired
                    undefined, // isSessionStartNotificationEnabled
                    undefined, // isSessionEndNotificationEnabled
                    undefined, // notificationEmailAddresses (managed by SiteManagerWorkflow)
                    this.jumpPolicyNotificationDisplayName, // notificationDisplayName
                    undefined, // notificationEmailLanguage
                    AuthJumpPolicyWorkflow.IS_APPROVAL_REQUIRED, // isApprovalRequired
                    AuthJumpPolicyWorkflow.APPROVAL_MAX_DURATION_IN_MINUTES, // approvalMaxDurationInMinutes
                    undefined, // approvalScopeType
                    this.generateApprovalEmailAddresses(), // approvalEmailAddresses (site approvers only)
                    undefined, // approvalUserIds (managed by SiteManagerWorkflow)
                    undefined, // approvalTeamIds
                    this.jumpPolicyApprovalDisplayName, // approvalDisplayName
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

    private generateApprovalEmailAddresses(): string[] {
        return ObjectUtility.filterUnique<string>([...this.siteApprovers.map((siteApprover) => siteApprover.email)]);
    }
}
