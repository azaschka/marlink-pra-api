import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { BillingType } from '../../../customer/enums';
import { Customer } from '../../../customer/models';
import { RetrieveCustomerByIdQuery } from '../../../customer/queries';
import { CustomerLicenseUsageCalculatedEvent } from '../../events';
import { CustomerLicenseUsage, LicenseUsage } from '../../models';
import { CalculateAssetLicenseUsageCommand } from '../calculate-asset-license-usage.command';
import { CalculateCustomerLicenseUsageCommand } from '../calculate-customer-license-usage.command';
import { CalculateUserLicenseUsageCommand } from '../calculate-user-license-usage.command';

@CommandHandler(CalculateCustomerLicenseUsageCommand)
export class CalculateCustomerLicenseUsageCommandHandler
    implements ICommandHandler<CalculateCustomerLicenseUsageCommand>
{
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: CalculateCustomerLicenseUsageCommand): Promise<CustomerLicenseUsage> {
        const customer = await this.getCustomer(command.transactionId, command.id);
        const licenseUsage = await this.calculateLicenseUsage(command.transactionId, customer);

        const customerLicenseUsage: CustomerLicenseUsage = {
            customerId: customer.id,
            billingType: customer.billingType,
            totalLicenseUsage: licenseUsage.totalLicenseUsage,
            licenseUsageSourceData: licenseUsage.licenseUsageSourceData,
        };

        this.eventBus.publish(
            new CustomerLicenseUsageCalculatedEvent(command.transactionId, {
                customerLicenseUsage,
            }),
        );

        return customerLicenseUsage;
    }

    private async calculateLicenseUsage(transactionId: string, customer: Customer) {
        if (customer.billingType === BillingType.User) {
            return await this.commandBus.execute<CalculateUserLicenseUsageCommand, LicenseUsage>(
                new CalculateUserLicenseUsageCommand(transactionId, customer),
            );
        }

        return await this.commandBus.execute<CalculateAssetLicenseUsageCommand, LicenseUsage>(
            new CalculateAssetLicenseUsageCommand(transactionId, customer),
        );
    }

    private async getCustomer(transactionId: string, customerId: number) {
        const customer = await this.queryBus.execute<RetrieveCustomerByIdQuery, Customer>(
            new RetrieveCustomerByIdQuery(transactionId, customerId),
        );

        return customer;
    }
}
