import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CustomerCreatedEvent } from '../../events';
import { Customer } from '../../models';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { CreateCustomerCommand } from '../create-customer.command';

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerCommandHandler implements ICommandHandler<CreateCustomerCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: CreateCustomerCommand): Promise<Customer> {
        const customerEntity = CustomerEntity.createWithoutId(
            command.key,
            command.name,
            false, // by default new customers are active
            command.billingType,
            123, // TODO fix
        );
        const createdCustomer = await this.customerRepositoryService.create(customerEntity);

        this.eventBus.publish(
            new CustomerCreatedEvent(command.transactionId, {
                customer: createdCustomer,
            }),
        );

        return createdCustomer;
    }
}
