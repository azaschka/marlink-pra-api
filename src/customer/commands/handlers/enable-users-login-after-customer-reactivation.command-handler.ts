import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { GroupPolicyMember } from '../../../group-policy-member/models';
import { RetrieveGroupPolicyMembersQuery } from '../../../group-policy-member/queries';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { ErrorProcessorUtility, PaginationUtility } from '../../../shared/utilities';
import { UserGroupPolicy } from '../../../user-group-policy/models';
import { RetrieveUserGroupPoliciesQuery } from '../../../user-group-policy/queries';
import { ModifyUserCommand } from '../../../user/commands';
import { EnableUsersLoginAfterCustomerReactivationFailedEvent } from '../../events';
import { Customer } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { EnableUsersLoginAfterCustomerReactivationCommand } from '../enable-users-login-after-customer-reactivation.command';

@CommandHandler(EnableUsersLoginAfterCustomerReactivationCommand)
export class EnableUsersLoginAfterCustomerReactivationCommandHandler
    implements ICommandHandler<EnableUsersLoginAfterCustomerReactivationCommand>
{
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: EnableUsersLoginAfterCustomerReactivationCommand): Promise<void> {
        try {
            const customer = await this.getCustomer(command.customerId);
            const customerExclusiveUserIds = await this.getExclusiveUserIds(command.transactionId, customer);

            for (const userId of customerExclusiveUserIds) {
                await this.tryEnableUserLogin(command.transactionId, userId, command.customerId);
            }
        } catch (error) {
            this.eventBus.publish(
                new EnableUsersLoginAfterCustomerReactivationFailedEvent(command.transactionId, {
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
     * This is to ensure that we do not enable login for users who are part of other customers.
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
                            EnableUsersLoginAfterCustomerReactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
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
            const userGroupPolicies = await PaginationUtility.queryUntilLastPage<UserGroupPolicy>(
                (pageNumber: number) =>
                    this.queryBus.execute<RetrieveUserGroupPoliciesQuery, UserGroupPolicy[]>(
                        new RetrieveUserGroupPoliciesQuery(
                            transactionId,
                            EnableUsersLoginAfterCustomerReactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            associatedUserId,
                        ),
                    ),
            );

            const isUserAssociatedWithMultipleCustomers =
                userGroupPolicies.filter((userGroupPolicy) =>
                    (userGroupPolicy as unknown as { groupPolicy: GroupPolicy }).groupPolicy.name.includes(
                        this.appConfigService.customer.groupPolicy.administratorPrefix,
                    ),
                ).length > 1;

            if (!isUserAssociatedWithMultipleCustomers) {
                exclusiveUserIds.add(associatedUserId);
            }
        }

        return exclusiveUserIds;
    }

    private async getCustomerAssociatedGroupPolicies(transactionId: string, customer: Customer) {
        return await PaginationUtility.queryUntilLastPage<GroupPolicy>((pageNumber: number) =>
            this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
                new RetrieveGroupPoliciesQuery(
                    transactionId,
                    EnableUsersLoginAfterCustomerReactivationCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    undefined,
                    `%${customer.name.toUpperCase()}%`,
                ),
            ),
        );
    }

    private async tryEnableUserLogin(transactionId: string, userId: number, customerId: number) {
        try {
            await this.commandBus.execute<ModifyUserCommand>(
                new ModifyUserCommand(
                    transactionId,
                    userId,
                    undefined, // publicDisplayName
                    undefined, // username
                    undefined, // password
                    undefined, // passwordExpirationDate
                    undefined, // email
                    undefined, // preferredEmailLanguage
                    undefined, // isTwoFactorAuthRequired
                    true,
                ),
            );
        } catch (error) {
            this.eventBus.publish(
                new EnableUsersLoginAfterCustomerReactivationFailedEvent(transactionId, {
                    customerId: customerId,
                    errorMessage: `Failed to enable login for user id ${userId}: ${ErrorProcessorUtility.stringify(error)}`,
                }),
            );
        }
    }
}
