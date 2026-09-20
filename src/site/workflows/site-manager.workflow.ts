import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { ModifyJumpPolicyCommand } from '../../jump-policy/commands';
import { JumpPolicy } from '../../jump-policy/models';
import { ObjectUtility } from '../../shared/utilities';
import { BaseWorkflow } from '../../shared/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { User } from '../../user/models';
import { SiteUserType } from '../enums';
import { UserSourceType } from '../../user/enums';
import { UserNotFoundException } from '../exceptions';
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
        private readonly customerBeyondtrustInstanceId: number,
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
            this.customerBeyondtrustInstanceId,
        );

        this.managerAccessGroupPolicyWorkflow = new ManagerAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );
    }

    /**
     * @throws UserNotFoundException if the site manager user cannot be found
     * @throws MultipleUsersFoundException if more than one user is found with the same email or username
     */
    public async getOrCreate(): Promise<PartialSiteManagerWithUserId> {
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const managerAccessGroupPolicy = await this.managerAccessGroupPolicyWorkflow.getOrCreate();
        const authJumpPolicy = await this.authJumpPolicyWorkflow.getOrCreate();
        const notifyJumpPolicy = await this.notifyJumpPolicyWorkflow.getOrCreate();
        const siteManagerUser = await this.siteManagerUserWorkflow.getOrCreate();

        if (!siteManagerUser) {
            throw new UserNotFoundException(
                SiteUserType.SiteManager,
                this.siteManager.username,
                this.siteManager.email,
            );
        }

        // Assign the site manager user to their group policies:
        //   - MANAGERS_{CUSTOMER}_{SITE}_{SITEKEY}  — site-specific manager group policy
        //   - MANAGER_ACCESS                        — global BeyondTrust manager access policy
        //
        // Additionally, the manager's email is registered as a notification recipient and approver
        // on the site's auth jump policy, and as a notification recipient on the notify jump policy.
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                siteManagerUser.id,
                [managerGroupPolicy.id, managerAccessGroupPolicy.id],
                [],
            ),
        );

        await this.modifyAuthJumpPolicyNotificationEmailAddresses(authJumpPolicy, [this.siteManager.email], []);
        await this.modifyAuthJumpPolicyApprovalUserIds(authJumpPolicy, [siteManagerUser.id.toString()], []);
        await this.modifyNotifyJumpPolicyNotificationEmailAddresses(notifyJumpPolicy, [this.siteManager.email], []);

        return {
            ...this.siteManager,
            userId: siteManagerUser.id,
        };
    }

    /**
     * @throws UserNotFoundException if the site manager user cannot be found
     * @throws MultipleUsersFoundException if more than one user is found with the same email or username
     */
    public async delete(): Promise<void> {
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const managerAccessGroupPolicy = await this.managerAccessGroupPolicyWorkflow.getOrCreate();
        const authJumpPolicy = await this.authJumpPolicyWorkflow.getOrCreate();
        const notifyJumpPolicy = await this.notifyJumpPolicyWorkflow.getOrCreate();
        const siteManagerUser = await this.siteManagerUserWorkflow.getOrCreate();

        if (!siteManagerUser) {
            throw new UserNotFoundException(
                SiteUserType.SiteManager,
                this.siteManager.username,
                this.siteManager.email,
            );
        }

        const isSiteManagerAssociatedWithMultipleSites =
            await this.isSiteManagerAssociatedWithMultipleSites(siteManagerUser);

        // Remove the site manager user from their group policies.
        // MANAGER_ACCESS is global and must only be removed when the user is no longer a manager on any site.
        // If the user is still a manager on other sites, only the site-specific MANAGERS_{CUSTOMER}_{SITE}_{SITEKEY}
        // policy is removed — MANAGER_ACCESS stays in place.
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                siteManagerUser.id,
                [],
                isSiteManagerAssociatedWithMultipleSites
                    ? [managerGroupPolicy.id]
                    : [managerGroupPolicy.id, managerAccessGroupPolicy.id],
            ),
        );

        await this.modifyAuthJumpPolicyNotificationEmailAddresses(authJumpPolicy, [], [this.siteManager.email]);
        await this.modifyAuthJumpPolicyApprovalUserIds(authJumpPolicy, [], [siteManagerUser.id.toString()]);
        await this.modifyNotifyJumpPolicyNotificationEmailAddresses(notifyJumpPolicy, [], [this.siteManager.email]);

        // The site manager user is only deleted if they are not associated with any other sites and they are an internal user.
        // External users are not managed by the system, so we don't delete them.
        if (!isSiteManagerAssociatedWithMultipleSites && this.siteManager.sourceType === UserSourceType.Internal) {
            await this.siteManagerUserWorkflow.delete();
        }
    }

    private async modifyAuthJumpPolicyNotificationEmailAddresses(
        authJumpPolicy: JumpPolicy,
        emailsToAdd: string[],
        emailsToRemove: string[],
    ): Promise<void> {
        const currentNotificationEmails = authJumpPolicy.notificationEmailAddresses ?? [];

        // Merge, deduplicate, and remove unwanted emails
        const newNotificationEmails = ObjectUtility.filterUnique(
            currentNotificationEmails.concat(emailsToAdd).filter((email) => !emailsToRemove.includes(email)),
        );

        if (newNotificationEmails.length === 0) {
            return; // Site manager's auth jump policy must have at least one notification email
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
                this.customerBeyondtrustInstanceId,
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
                undefined, // approvalEmailAddresses (not modified here - only site approvers)
                undefined, // approvalUserIds
                undefined, // approvalTeamIds
                undefined, // approvalDisplayName
                undefined, // approvalEmailLanguage
                undefined, // approvalApproverScopeType
                undefined,
            ),
        );
    }

    private async modifyAuthJumpPolicyApprovalUserIds(
        authJumpPolicy: JumpPolicy,
        userIdsToAdd: string[],
        userIdsToRemove: string[],
    ): Promise<void> {
        const currentApprovalUserIds = authJumpPolicy.approvalUserIds ?? [];

        // Merge, deduplicate, and remove unwanted user IDs
        const newApprovalUserIds = ObjectUtility.filterUnique(
            currentApprovalUserIds.concat(userIdsToAdd).filter((userId) => !userIdsToRemove.includes(userId)),
        );

        if (newApprovalUserIds.length === 0) {
            return; // Auth jump policy must have at least one approver (either user ID or email)
        }

        if (
            newApprovalUserIds.length === currentApprovalUserIds.length &&
            newApprovalUserIds.every((userId) => currentApprovalUserIds.includes(userId))
        ) {
            return; // No changes needed
        }

        await this.commandBus.execute<ModifyJumpPolicyCommand, JumpPolicy>(
            new ModifyJumpPolicyCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
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
                undefined, // notificationEmailAddresses (not modified here)
                undefined, // notificationDisplayName
                undefined, // notificationEmailLanguage
                undefined, // isApprovalRequired
                undefined, // approvalMaxDurationInMinutes
                undefined, // approvalScopeType
                undefined, // approvalEmailAddresses (only site approvers - not modified here)
                newApprovalUserIds, // approvalUserIds
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
                this.customerBeyondtrustInstanceId,
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
