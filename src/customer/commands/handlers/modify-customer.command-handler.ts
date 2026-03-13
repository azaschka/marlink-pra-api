import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CustomerModifiedEvent } from '../../events';
import { Customer } from '../../models';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { ModifyCustomerCommand } from '../modify-customer.command';

@CommandHandler(ModifyCustomerCommand)
export class ModifyCustomerCommandHandler implements ICommandHandler<ModifyCustomerCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: ModifyCustomerCommand): Promise<Customer> {
        const customerEntity = await this.customerRepositoryService.findOneById(command.id);

        if (!customerEntity) {
            throw new NotFoundException();
        }

        const modifiedCustomerEntity = CustomerEntity.create(
            customerEntity.id,
            customerEntity.key,
            customerEntity.name,
            customerEntity.isDeactivated,
            command.beyondtrustInstanceId ?? customerEntity.beyondtrustInstanceId,
        );

        await this.customerRepositoryService.createOrUpdateById(modifiedCustomerEntity);

        this.eventBus.publish(
            new CustomerModifiedEvent(command.transactionId, {
                customer: modifiedCustomerEntity,
            }),
        );

        return modifiedCustomerEntity;
    }
}
