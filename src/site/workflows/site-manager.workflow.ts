import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { ModifyJumpPolicyCommand } from '../../jump-policy/commands';
import { JumpPolicy } from '../../jump-policy/models';
import { ObjectUtility } from '../../shared/utilities';
import { BaseWorkflow } from '../../shared/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { PartialSiteManager, PartialSiteManagerWithUserId } from '../models';
import { ManagerAccessGroupPolicyWorkflow, ManagerGroupPolicyWorkflow } from './group-policies';
import { AuthJumpPolicyWorkflow, NotifyJumpPolicyWorkflow } from './jump-policies';
import { SiteManagerUserWorkflow } from './users';

export class SiteManagerWorkflow implements BaseWorkflow<PartialSiteManagerWithUserId> {
    private readonly siteManagerUserWorkflow: SiteManagerUserWorkflow;
    private readonly managerAccessGroupPolicyWorkflow: ManagerAccessGroupPolicyWorkflow;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteManager: PartialSiteManager,
        private readonly managerGroupPolicyWorkflow: ManagerGroupPolicyWorkflow,
        private readonly authJumpPolicyWorkflow: AuthJumpPolicyWorkflow,
        private readonly notifyJumpPolicyWorkflow: NotifyJumpPolicyWorkflow,
    ) {
        this.siteManagerUserWorkflow = new SiteManagerUserWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteManager,
        );

        this.managerAccessGroupPolicyWorkflow = new ManagerAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
        );
    }

    public async getOrCreate(): Promise<PartialSiteManagerWithUserId> {
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const managerAccessGroupPolicy = await this.managerAccessGroupPolicyWorkflow.getOrCreate();
        const siteManagerUser = await this.siteManagerUserWorkflow.getOrCreate();

        // Add the site manager user to the manager group policy and manager access group policy
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                siteManagerUser.id,
                [managerGroupPolicy.id, managerAccessGroupPolicy.id],
                [],
            ),
        );

        await this.modifyAuthJumpPolicyNotificationAndApprovalEmailAddresses();
        await this.modifyNotifyJumpPolicyNotificationEmailAddresses();

        return {
            ...this.siteManager,
            userId: siteManagerUser.id,
        };
    }

    public async delete(): Promise<void> {}

    private async modifyAuthJumpPolicyNotificationAndApprovalEmailAddresses() {
        const authJumpPolicy = await this.authJumpPolicyWorkflow.getOrCreate();

        const newNotificationEmailAddresses = ObjectUtility.filterUnique([
            ...(authJumpPolicy.notificationEmailAddresses ?? []),
            this.siteManager.email,
        ]);
        const newApprovalEmailAddresses = ObjectUtility.filterUnique([
            ...(authJumpPolicy.approvalEmailAddresses ?? []),
            this.siteManager.email,
        ]);

        if (
            newNotificationEmailAddresses.length === (authJumpPolicy.notificationEmailAddresses ?? []).length &&
            newApprovalEmailAddresses.length === (authJumpPolicy.approvalEmailAddresses ?? []).length
        ) {
            return; // No changes needed
        }

        await this.commandBus.execute<ModifyJumpPolicyCommand, JumpPolicy>(
            new ModifyJumpPolicyCommand(
                this.transactionId,
                authJumpPolicy.id,
                undefined, // displayName
                undefined, // codeName
                undefined, // description
                undefined, // hasScheduledAccessRestriction
                undefined, // simultaneousJumpsType
                undefined, // doesSimultaneousJumpBehaviorApplyToCopies
                undefined, // simultaneousJumpsRdpType
                undefined, // shouldForceRemoveUsersWhenScheduleDisallows
                undefined, // isTicketIdRequired
                undefined, // isTwoFactorChallengeRequired
                undefined, // isSessionStartNotificationEnabled
                undefined, // isSessionEndNotificationEnabled
                newNotificationEmailAddresses, // notificationEmailAddresses
                undefined, // notificationDisplayName
                undefined, // notificationEmailLanguage
                undefined, // isApprovalRequired
                undefined, // approvalMaxDurationInMinutes
                undefined, // approvalScopeType
                newApprovalEmailAddresses, // approvalEmailAddresses
                undefined, // approvalUserIds
                undefined, // approvalTeamIds
                undefined, // approvalDisplayName
                undefined, // approvalEmailLanguage
                undefined, // approvalApproverScopeType
                undefined,
            ),
        );
    }

    private async modifyNotifyJumpPolicyNotificationEmailAddresses() {
        const notifyJumpPolicy = await this.notifyJumpPolicyWorkflow.getOrCreate();

        const newNotificationEmailAddresses = ObjectUtility.filterUnique([
            ...(notifyJumpPolicy.notificationEmailAddresses ?? []),
            this.siteManager.email,
        ]);

        if (newNotificationEmailAddresses.length === (notifyJumpPolicy.notificationEmailAddresses ?? []).length) {
            return; // No changes needed
        }

        await this.commandBus.execute<ModifyJumpPolicyCommand, JumpPolicy>(
            new ModifyJumpPolicyCommand(
                this.transactionId,
                notifyJumpPolicy.id,
                undefined, // displayName
                undefined, // codeName
                undefined, // description
                undefined, // hasScheduledAccessRestriction
                undefined, // simultaneousJumpsType
                undefined, // doesSimultaneousJumpBehaviorApplyToCopies
                undefined, // simultaneousJumpsRdpType
                undefined, // shouldForceRemoveUsersWhenScheduleDisallows
                undefined, // isTicketIdRequired
                undefined, // isTwoFactorChallengeRequired
                undefined, // isSessionStartNotificationEnabled
                undefined, // isSessionEndNotificationEnabled
                newNotificationEmailAddresses, // notificationEmailAddresses
                undefined, // notificationDisplayName
                undefined, // notificationEmailLanguage
                undefined, // isApprovalRequired
                undefined, // approvalMaxDurationInMinutes
                undefined, // approvalScopeType
                undefined, // approvalEmailAddresses
                undefined, // approvalUserIds
                undefined, // approvalTeamIds
                undefined, // approvalDisplayName
                undefined, // approvalEmailLanguage
                undefined, // approvalApproverScopeType
                undefined,
            ),
        );
    }
}
