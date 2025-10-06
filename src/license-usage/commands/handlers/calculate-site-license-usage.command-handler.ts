import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { BillingType } from '../../../beyondtrust-instance/enums';
import { BeyondtrustInstance } from '../../../beyondtrust-instance/models';
import { RetrieveBeyondtrustInstanceByIdQuery } from '../../../beyondtrust-instance/queries';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { Site } from '../../../site/models';
import { RetrieveSiteByIdQuery } from '../../../site/queries';
import { SiteLicenseUsageCalculatedEvent } from '../../events';
import { LicenseUsage, SiteLicenseUsage } from '../../models';
import { CalculateAssetLicenseUsageCommand } from '../calculate-asset-license-usage.command';
import { CalculateSiteLicenseUsageCommand } from '../calculate-site-license-usage.command';
import { CalculateUserLicenseUsageCommand } from '../calculate-user-license-usage.command';

@CommandHandler(CalculateSiteLicenseUsageCommand)
export class CalculateSiteLicenseUsageCommandHandler implements ICommandHandler<CalculateSiteLicenseUsageCommand> {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: CalculateSiteLicenseUsageCommand): Promise<SiteLicenseUsage> {
        const site = await this.getSite(command.transactionId, command.id);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);
        const beyondtrustInstance = await this.getBeyondtrustInstance(
            command.transactionId,
            customer.beyondtrustInstanceId,
        );
        const licenseUsage = await this.calculateLicenseUsage(
            command.transactionId,
            customer,
            site,
            beyondtrustInstance,
        );

        const siteLicenseUsage: SiteLicenseUsage = {
            siteId: site.id,
            customerId: customer.id,
            billingType: beyondtrustInstance.billingType,
            totalLicenseUsage: licenseUsage.totalLicenseUsage,
            licenseUsageSourceData: licenseUsage.licenseUsageSourceData,
        };

        this.eventBus.publish(
            new SiteLicenseUsageCalculatedEvent(command.transactionId, {
                siteLicenseUsage,
            }),
        );

        return siteLicenseUsage;
    }

    private async calculateLicenseUsage(
        transactionId: string,
        customer: Customer,
        site: Site,
        beyondtrustInstance: BeyondtrustInstance,
    ) {
        if (beyondtrustInstance.billingType === BillingType.User) {
            return await this.commandBus.execute<CalculateUserLicenseUsageCommand, LicenseUsage>(
                new CalculateUserLicenseUsageCommand(transactionId, customer, site),
            );
        }

        return await this.commandBus.execute<CalculateAssetLicenseUsageCommand, LicenseUsage>(
            new CalculateAssetLicenseUsageCommand(transactionId, customer, site),
        );
    }

    private async getSite(transactionId: string, siteId: number) {
        const site = await this.queryBus.execute<RetrieveSiteByIdQuery, Site>(
            new RetrieveSiteByIdQuery(transactionId, siteId),
        );

        return site;
    }

    private async getCustomer(transactionId: string, customerKey: string) {
        const customers = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, customerKey),
        );

        if (customers.length === 0 || !customers[0]) {
            throw new NotFoundException(`Customer with key ${customerKey} not found`);
        }

        return customers[0];
    }

    private async getBeyondtrustInstance(transactionId: string, beyondtrustInstanceId: number) {
        const beyondtrustInstance = await this.queryBus.execute<
            RetrieveBeyondtrustInstanceByIdQuery,
            BeyondtrustInstance
        >(new RetrieveBeyondtrustInstanceByIdQuery(transactionId, beyondtrustInstanceId));

        return beyondtrustInstance;
    }
}
