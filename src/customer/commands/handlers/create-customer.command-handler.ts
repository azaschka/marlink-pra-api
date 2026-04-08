import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BeyondtrustInstance } from '../../../beyondtrust-instance/models';
import { RetrieveBeyondtrustInstanceByIdQuery } from '../../../beyondtrust-instance/queries';
import { CustomerCreatedEvent } from '../../events';
import { Customer } from '../../models';
import { RetrieveCustomersQuery } from '../../queries';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { AdministratorGroupPolicyWorkflow } from '../../workflows';
import { CreateCustomerCommand } from '../create-customer.command';

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerCommandHandler implements ICommandHandler<CreateCustomerCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: CreateCustomerCommand): Promise<Customer> {
        await this.validateBeyondTrustInstanceId(command.transactionId, command.beyondtrustInstanceId);
        await this.validateCustomerKeyAndName(command.transactionId, command.key, command.name);
        await this.runWorkflow(command.transactionId, command.name, command.beyondtrustInstanceId);

        const customerEntity = CustomerEntity.createWithoutId(
            command.key,
            command.name,
            false, // by default new customers are active
            command.beyondtrustInstanceId,
        );
        const createdCustomer = await this.customerRepositoryService.create(customerEntity);

        this.eventBus.publish(
            new CustomerCreatedEvent(command.transactionId, {
                customer: createdCustomer,
            }),
        );

        return createdCustomer;
    }

    private async validateBeyondTrustInstanceId(transactionId: string, beyondtrustInstanceId: number): Promise<void> {
        const beyondtrustInstance = await this.queryBus.execute<
            RetrieveBeyondtrustInstanceByIdQuery,
            BeyondtrustInstance
        >(new RetrieveBeyondtrustInstanceByIdQuery(transactionId, beyondtrustInstanceId));

        if (!beyondtrustInstance) {
            throw new NotFoundException(`BeyondTrust instance with ID "${beyondtrustInstanceId}" does not exist.`);
        }
    }

    private async validateCustomerKeyAndName(transactionId: string, key: string, name: string): Promise<void> {
        const customersWithSameKey = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, key, undefined),
        );

        if (customersWithSameKey.length > 0) {
            throw new ConflictException(`Customer with key "${key}" already exists.`);
        }

        const customersWithMatchingName = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, undefined, undefined, `%${name}%`),
        );

        if (customersWithMatchingName.length > 0) {
            throw new ConflictException(`Customer matching the name "${name}" already exists.`);
        }
    }

    private async runWorkflow(
        transactionId: string,
        customerName: string,
        customerBeyondTrustInstanceId: number,
    ): Promise<void> {
        const workflow = new AdministratorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customerName,
            customerBeyondTrustInstanceId,
        );

        await workflow.getOrCreate();
    }
}
