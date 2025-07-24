import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { ModifyJumpPolicyCommand } from '../../jump-policy/commands';
import { JumpPolicy } from '../../jump-policy/models';
import { ObjectUtility } from '../../shared/utilities';
import { BaseWorkflow } from '../../shared/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { User } from '../../user/models';
import { PartialSiteManager, PartialSiteManagerWithUserId, SiteManager } from '../models';
import { RetrieveSiteManagersByUserIdQuery } from '../queries';
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
        const authJumpPolicy = await this.authJumpPolicyWorkflow.getOrCreate();
        const notifyJumpPolicy = await this.notifyJumpPolicyWorkflow.getOrCreate();

        // Add the site manager user to the manager group policy and manager access group policy
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                siteManagerUser.id,
                [managerGroupPolicy.id, managerAccessGroupPolicy.id],
                [],
            ),
        );

        await this.modifyAuthJumpPolicyNotificationAndApprovalEmailAddresses(
            authJumpPolicy,
            [this.siteManager.email],
            [],
        );
        await this.modifyNotifyJumpPolicyNotificationEmailAddresses(notifyJumpPolicy, [this.siteManager.email], []);

        return {
            ...this.siteManager,
            userId: siteManagerUser.id,
        };
    }

    public async delete(): Promise<void> {
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const managerAccessGroupPolicy = await this.managerAccessGroupPolicyWorkflow.getOrCreate();
        const siteManagerUser = await this.siteManagerUserWorkflow.getOrCreate();
        const authJumpPolicy = await this.authJumpPolicyWorkflow.getOrCreate();
        const notifyJumpPolicy = await this.notifyJumpPolicyWorkflow.getOrCreate();
        const isSiteManagerAssociatedWithMultipleSites =
            await this.isSiteManagerAssociatedWithMultipleSites(siteManagerUser);

        // Remove the site manager user from the manager group policy and
        // manager access group policy if they are not associated with multiple sites
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                siteManagerUser.id,
                [],
                isSiteManagerAssociatedWithMultipleSites
                    ? [managerGroupPolicy.id]
                    : [managerGroupPolicy.id, managerAccessGroupPolicy.id],
            ),
        );

        await this.modifyAuthJumpPolicyNotificationAndApprovalEmailAddresses(
            authJumpPolicy,
            [],
            [this.siteManager.email],
        );
        await this.modifyNotifyJumpPolicyNotificationEmailAddresses(notifyJumpPolicy, [], [this.siteManager.email]);
    }

    private async modifyAuthJumpPolicyNotificationAndApprovalEmailAddresses(
        authJumpPolicy: JumpPolicy,
        emailsToAdd: string[],
        emailsToRemove: string[],
    ): Promise<void> {
        const currentNotificationEmails = authJumpPolicy.notificationEmailAddresses ?? [];
        const currentApprovalEmails = authJumpPolicy.approvalEmailAddresses ?? [];

        // Merge, deduplicate, and remove unwanted emails
        const newNotificationEmails = ObjectUtility.filterUnique(
            currentNotificationEmails.concat(emailsToAdd).filter((email) => !emailsToRemove.includes(email)),
        );
        const newApprovalEmails = ObjectUtility.filterUnique(
            currentApprovalEmails.concat(emailsToAdd).filter((email) => !emailsToRemove.includes(email)),
        );

        if (newNotificationEmails.length === 0 || newApprovalEmails.length === 0) {
            return; // Site manager's auth jump policy must have at least one notification and approval email
        }

        if (
            newNotificationEmails.length === currentNotificationEmails.length &&
            newApprovalEmails.length === currentApprovalEmails.length &&
            newNotificationEmails.every((email) => currentNotificationEmails.includes(email)) &&
            newApprovalEmails.every((email) => currentApprovalEmails.includes(email))
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
                newNotificationEmails, // notificationEmailAddresses
                undefined, // notificationDisplayName
                undefined, // notificationEmailLanguage
                undefined, // isApprovalRequired
                undefined, // approvalMaxDurationInMinutes
                undefined, // approvalScopeType
                newApprovalEmails, // approvalEmailAddresses
                undefined, // approvalUserIds
                undefined, // approvalTeamIds
                undefined, // approvalDisplayName
                undefined, // approvalEmailLanguage
                undefined, // approvalApproverScopeType
                undefined,
            ),
        );
    }

    private async modifyNotifyJumpPolicyNotificationEmailAddresses(
        notifyJumpPolicy: JumpPolicy,
        emailsToAdd: string[],
        emailsToRemove: string[],
    ) {
        const currentNotificationEmails = notifyJumpPolicy.notificationEmailAddresses ?? [];

        // Merge, deduplicate, and remove unwanted emails
        const newNotificationEmails = ObjectUtility.filterUnique(
            currentNotificationEmails.concat(emailsToAdd).filter((email) => !emailsToRemove.includes(email)),
        );

        if (newNotificationEmails.length === 0) {
            return; // Site manager's notify jump policy must have at least one notification email
        }

        if (
            newNotificationEmails.length === currentNotificationEmails.length &&
            newNotificationEmails.every((email) => currentNotificationEmails.includes(email))
        ) {
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
                newNotificationEmails, // notificationEmailAddresses
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

    private async isSiteManagerAssociatedWithMultipleSites(siteManagerUser: User) {
        const siteManagers = await this.queryBus.execute<RetrieveSiteManagersByUserIdQuery, SiteManager[]>(
            new RetrieveSiteManagersByUserIdQuery(this.transactionId, 2, 1, siteManagerUser.id),
        );

        return siteManagers.length > 1;
    }
}
