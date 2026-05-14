import { ConflictException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Site } from '../../../site/models';
import { RetrieveSitesQuery } from '../../../site/queries';
import { CustomerDeletedEvent } from '../../events';
import { Customer } from '../../models';
import { RetrieveCustomerByIdQuery } from '../../queries';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { AdministratorGroupPolicyWorkflow, SupportTeamArtifactsWorkflow } from '../../workflows';
import { DeleteCustomerCommand } from '../delete-customer.command';

@CommandHandler(DeleteCustomerCommand)
export class DeleteCustomerCommandHandler implements ICommandHandler<DeleteCustomerCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: DeleteCustomerCommand): Promise<void> {
        const customer = await this.getCustomer(command.transactionId, command.id);

        await this.validateCustomerIsNotRelatedToAnySite(command.transactionId, customer.key);

        await this.runWorkflow(command.transactionId, customer.name, customer.beyondtrustInstanceId);
        await this.customerRepositoryService.deleteById(command.id);

        this.eventBus.publish(new CustomerDeletedEvent(command.transactionId, { id: command.id }));
    }

    private async getCustomer(transactionId: string, customerId: number) {
        const customer = await this.queryBus.execute<RetrieveCustomerByIdQuery, Customer>(
            new RetrieveCustomerByIdQuery(transactionId, customerId),
        );

        return customer;
    }

    private async validateCustomerIsNotRelatedToAnySite(transactionId: string, customerKey: string) {
        const sites = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, undefined, undefined, [customerKey]),
        );

        if (sites.length > 0) {
            throw new ConflictException(`Customer still have a site`);
        }
    }

    private async runWorkflow(
        transactionId: string,
        customerName: string,
        customerBeyondTrustInstanceId: number,
    ): Promise<void> {
        // 1. Delete the Administrator Group Policy and its orphaned users
        const adminWorkflow = new AdministratorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customerName,
            customerBeyondTrustInstanceId,
        );
        await adminWorkflow.delete();

        // 2. Delete all Support Team artifacts:
        //    - Support Team Jump Groups  ({customerName}_{supportTeamName})
        //    - Jump Client Installers    (linked to those Jump Groups)
        //    - Support Team Group Policies ({CUSTOMER_NAME}_{SUPPORT_TEAM_NAME})
        const supportTeamWorkflow = new SupportTeamArtifactsWorkflow(
            this.queryBus,
            this.commandBus,
            transactionId,
            customerName,
            customerBeyondTrustInstanceId,
        );
        await supportTeamWorkflow.delete();
    }
}
