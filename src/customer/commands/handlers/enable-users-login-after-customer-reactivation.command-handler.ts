import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { ErrorProcessorUtility } from '../../../shared/utilities';
import { ModifyUserCommand } from '../../../user/commands';
import { EnableUsersLoginAfterCustomerReactivationFailedEvent } from '../../events';
import { Customer } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { CustomerExclusiveUsersWorkflow } from '../../workflows';
import { EnableUsersLoginAfterCustomerReactivationCommand } from '../enable-users-login-after-customer-reactivation.command';

/**
 * After a customer was reactivated: enables the login of the BeyondTrust users that belong to the customer only (CustomerExclusiveUsersWorkflow,
 * EXT-27). A user whose site roles cannot be read is left unchanged and reported.
 */
@CommandHandler(EnableUsersLoginAfterCustomerReactivationCommand)
export class EnableUsersLoginAfterCustomerReactivationCommandHandler implements ICommandHandler<EnableUsersLoginAfterCustomerReactivationCommand> {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
        private readonly appConfigService: AppConfigService,
    ) {}

    public async execute(command: EnableUsersLoginAfterCustomerReactivationCommand): Promise<void> {
        try {
            const customer = await this.getCustomer(command.customerId);
            const exclusiveUsers = await new CustomerExclusiveUsersWorkflow(
                this.appConfigService,
                this.queryBus,
                command.transactionId,
                customer,
            ).find();

            for (const skipped of exclusiveUsers.skipped) {
                this.publishFailure(
                    command.transactionId,
                    command.customerId,
                    `Login of user id ${skipped.userId} left unchanged: ${skipped.reason}`,
                );
            }

            for (const userId of exclusiveUsers.userIds) {
                await this.tryEnableUserLogin(command.transactionId, userId, command.customerId, customer);
            }
        } catch (error) {
            this.publishFailure(command.transactionId, command.customerId, ErrorProcessorUtility.stringify(error));
        }
    }

    private async getCustomer(customerId: number): Promise<Customer> {
        const customerEntity = await this.customerRepositoryService.findOneById(customerId);

        if (!customerEntity) {
            throw new NotFoundException();
        }

        return customerEntity;
    }

    private async tryEnableUserLogin(transactionId: string, userId: number, customerId: number, customer: Customer) {
        try {
            await this.commandBus.execute<ModifyUserCommand>(
                new ModifyUserCommand(
                    transactionId,
                    customer.beyondtrustInstanceId,
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
            this.publishFailure(
                transactionId,
                customerId,
                `Failed to enable login for user id ${userId}: ${ErrorProcessorUtility.stringify(error)}`,
            );
        }
    }

    private publishFailure(transactionId: string, customerId: number, errorMessage: string): void {
        this.eventBus.publish(
            new EnableUsersLoginAfterCustomerReactivationFailedEvent(transactionId, {
                customerId: customerId,
                errorMessage: errorMessage,
            }),
        );
    }
}
