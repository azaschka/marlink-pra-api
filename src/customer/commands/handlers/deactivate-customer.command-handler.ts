import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CustomerDeactivatedEvent } from '../../events';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { DeactivateCustomerCommand } from '../deactivate-customer.command';

@CommandHandler(DeactivateCustomerCommand)
export class DeactivateCustomerCommandHandler implements ICommandHandler<DeactivateCustomerCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: DeactivateCustomerCommand): Promise<void> {
        const customerEntity = await this.customerRepositoryService.findOneById(command.id);

        if (!customerEntity) {
            throw new NotFoundException();
        }

        customerEntity.isDeactivated = true;

        await this.customerRepositoryService.createOrUpdateById(customerEntity);

        this.eventBus.publish(new CustomerDeactivatedEvent(command.transactionId, { id: command.id }));
    }
}
