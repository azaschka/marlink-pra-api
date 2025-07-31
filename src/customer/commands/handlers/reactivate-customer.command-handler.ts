import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CustomerReactivatedEvent } from '../../events';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { ReactivateCustomerCommand } from '../reactivate-customer.command';

@CommandHandler(ReactivateCustomerCommand)
export class ReactivateCustomerCommandHandler implements ICommandHandler<ReactivateCustomerCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: ReactivateCustomerCommand): Promise<void> {
        const customerEntity = await this.customerRepositoryService.findOneById(command.id);

        if (!customerEntity) {
            throw new NotFoundException();
        }

        customerEntity.isDeactivated = false;

        await this.customerRepositoryService.createOrUpdateById(customerEntity);

        this.eventBus.publish(new CustomerReactivatedEvent(command.transactionId, { id: command.id }));
    }
}
