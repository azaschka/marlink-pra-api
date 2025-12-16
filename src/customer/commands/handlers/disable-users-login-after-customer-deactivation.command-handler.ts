import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GroupPolicyMember } from '../../../group-policy-member/models';
import { RetrieveGroupPolicyMembersQuery } from '../../../group-policy-member/queries';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { ErrorProcessorUtility, PaginationUtility } from '../../../shared/utilities';
import { Site, SiteAuditor, SiteManager, SiteSupportTeamMember } from '../../../site/models';
import {
    RetrieveSiteAuditorsByUserIdQuery,
    RetrieveSiteByIdQuery,
    RetrieveSiteManagersByUserIdQuery,
    RetrieveSiteSupportTeamMembersByUserIdQuery,
} from '../../../site/queries';
import { ModifyUserCommand } from '../../../user/commands';
import { DisableUsersLoginAfterCustomerDeactivationFailedEvent } from '../../events';
import { Customer } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { DisableUsersLoginAfterCustomerDeactivationCommand } from '../disable-users-login-after-customer-deactivation.command';

@CommandHandler(DisableUsersLoginAfterCustomerDeactivationCommand)
export class DisableUsersLoginAfterCustomerDeactivationCommandHandler implements ICommandHandler<DisableUsersLoginAfterCustomerDeactivationCommand> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: DisableUsersLoginAfterCustomerDeactivationCommand): Promise<void> {
        try {
            const customer = await this.getCustomer(command.customerId);
            const customerExclusiveUserIds = await this.getExclusiveUserIds(command.transactionId, customer);

            for (const userId of customerExclusiveUserIds) {
                await this.tryDisableUserLogin(
                    command.transactionId,
                    userId,
                    command.customerId,
                    customer.beyondtrustInstanceId,
                );
            }
        } catch (error) {
            this.eventBus.publish(
                new DisableUsersLoginAfterCustomerDeactivationFailedEvent(command.transactionId, {
                    customerId: command.customerId,
                    errorMessage: ErrorProcessorUtility.stringify(error),
                }),
            );
        }
    }

    private async getCustomer(customerId: number) {
        const customerEntity = await this.customerRepositoryService.findOneById(customerId);

        if (!customerEntity) {
            throw new NotFoundException();
        }

        return customerEntity;
    }

    /*
     * Only retrieve user IDs which only associated with the customer.
     * This is to ensure that we do not disable login for users who are part of other customers.
     */
    private async getExclusiveUserIds(transactionId: string, customer: Customer) {
        const exclusiveUserIds = new Set<number>();
        const allAssociatedUserIds = new Set<number>();
        const associatedGroupPolicies = await this.getCustomerAssociatedGroupPolicies(transactionId, customer);

        for (const associatedGroupPolicy of associatedGroupPolicies) {
            const groupPolicyMembers = await PaginationUtility.queryUntilLastPage<GroupPolicyMember>(
                (pageNumber: number) =>
                    this.queryBus.execute<RetrieveGroupPolicyMembersQuery, GroupPolicyMember[]>(
                        new RetrieveGroupPolicyMembersQuery(
                            transactionId,
                            customer.beyondtrustInstanceId,
                            DisableUsersLoginAfterCustomerDeactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            associatedGroupPolicy.id,
                        ),
                    ),
            );

            for (const groupPolicyMember of groupPolicyMembers) {
                allAssociatedUserIds.add(groupPolicyMember.userId);
            }
        }

        for (const associatedUserId of allAssociatedUserIds) {
            // Site auditor
            const siteAuditors = await PaginationUtility.queryUntilLastPage((pageNumber: number) =>
                this.queryBus.execute<RetrieveSiteAuditorsByUserIdQuery, SiteAuditor[]>(
                    new RetrieveSiteAuditorsByUserIdQuery(
                        transactionId,
                        DisableUsersLoginAfterCustomerDeactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                        pageNumber,
                        associatedUserId,
                    ),
                ),
            );
            const siteAuditorCustomerKeys = (
                await Promise.all(
                    siteAuditors.map(async (siteAuditor) => {
                        try {
                            const site = await this.queryBus.execute<RetrieveSiteByIdQuery, Site>(
                                new RetrieveSiteByIdQuery(transactionId, siteAuditor.siteId),
                            );

                            return site.customerKey;
                        } catch {
                            return undefined;
                        }
                    }),
                )
            ).filter((value) => value !== undefined);

            // Site manager
            const siteManagers = await PaginationUtility.queryUntilLastPage((pageNumber: number) =>
                this.queryBus.execute<RetrieveSiteManagersByUserIdQuery, SiteManager[]>(
                    new RetrieveSiteManagersByUserIdQuery(
                        transactionId,
                        DisableUsersLoginAfterCustomerDeactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                        pageNumber,
                        associatedUserId,
                    ),
                ),
            );
            const siteManagerCustomerKeys = (
                await Promise.all(
                    siteManagers.map(async (siteManager) => {
                        try {
                            const site = await this.queryBus.execute<RetrieveSiteByIdQuery, Site>(
                                new RetrieveSiteByIdQuery(transactionId, siteManager.siteId),
                            );

                            return site.customerKey;
                        } catch {
                            return undefined;
                        }
                    }),
                )
            ).filter((value) => value !== undefined);

            // Support team member
            const siteSupportTeamMembers = await PaginationUtility.queryUntilLastPage((pageNumber: number) =>
                this.queryBus.execute<RetrieveSiteSupportTeamMembersByUserIdQuery, SiteSupportTeamMember[]>(
                    new RetrieveSiteSupportTeamMembersByUserIdQuery(
                        transactionId,
                        DisableUsersLoginAfterCustomerDeactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                        pageNumber,
                        associatedUserId,
                    ),
                ),
            );
            const siteSupportTeamMemberCustomerKeys = (
                await Promise.all(
                    siteSupportTeamMembers.map(async (siteSupportTeamMember) => {
                        try {
                            const site = await this.queryBus.execute<RetrieveSiteByIdQuery, Site>(
                                new RetrieveSiteByIdQuery(transactionId, siteSupportTeamMember.siteId),
                            );

                            return site.customerKey;
                        } catch {
                            return undefined;
                        }
                    }),
                )
            ).filter((value) => value !== undefined);

            // TODO handle case where user is associated with other customer but other customer is also being deactivated
            if (siteAuditorCustomerKeys.length > 0 && siteAuditorCustomerKeys.some((key) => key !== customer.key)) {
                continue; // Skip if site auditor is associated with different customers
            }

            if (siteManagerCustomerKeys.length > 0 && siteManagerCustomerKeys.some((key) => key !== customer.key)) {
                continue; // Skip if site manager is associated with different customers
            }

            if (
                siteSupportTeamMemberCustomerKeys.length > 0 &&
                siteSupportTeamMemberCustomerKeys.some((key) => key !== customer.key)
            ) {
                continue; // Skip if support team member is associated with different customers
            }

            exclusiveUserIds.add(associatedUserId);
        }

        return exclusiveUserIds;
    }

    private async getCustomerAssociatedGroupPolicies(transactionId: string, customer: Customer) {
        return await PaginationUtility.queryUntilLastPage<GroupPolicy>((pageNumber: number) =>
            this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
                new RetrieveGroupPoliciesQuery(
                    transactionId,
                    customer.beyondtrustInstanceId,
                    DisableUsersLoginAfterCustomerDeactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    undefined,
                    [`%${customer.name.toUpperCase()}%`],
                ),
            ),
        );
    }

    private async tryDisableUserLogin(
        transactionId: string,
        userId: number,
        customerId: number,
        customerBeyondTrustInstanceId: number,
    ) {
        try {
            await this.commandBus.execute<ModifyUserCommand>(
                new ModifyUserCommand(
                    transactionId,
                    customerBeyondTrustInstanceId,
                    userId,
                    undefined, // publicDisplayName
                    undefined, // username
                    undefined, // password
                    undefined, // passwordExpirationDate
                    undefined, // email
                    undefined, // preferredEmailLanguage
                    undefined, // isTwoFactorAuthRequired
                    false,
                ),
            );
        } catch (error) {
            this.eventBus.publish(
                new DisableUsersLoginAfterCustomerDeactivationFailedEvent(transactionId, {
                    customerId: customerId,
                    errorMessage: `Failed to disable login for user id ${userId}: ${ErrorProcessorUtility.stringify(error)}`,
                }),
            );
        }
    }
}
