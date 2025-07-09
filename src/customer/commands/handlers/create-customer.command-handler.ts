import { ConflictException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { CreateGroupPolicyCommand } from '../../../group-policy/commands';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { CustomerCreatedEvent } from '../../events';
import { Customer } from '../../models';
import { RetrieveCustomersQuery } from '../../queries';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { CustomerUtility } from '../../utilities';
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
        await this.validateCustomerKeyAndName(command.transactionId, command.key, command.name);
        await this.createAdminGroupPolicyIfNotExist(command.transactionId, command.name);

        const customerEntity = CustomerEntity.createWithoutId(
            command.key,
            command.name,
            command.businessUnit,
            false, // by default new customers are active
            command.billingType,
        );
        const createdCustomer = await this.customerRepositoryService.create(customerEntity);

        this.eventBus.publish(
            new CustomerCreatedEvent(command.transactionId, {
                customer: createdCustomer,
            }),
        );

        return createdCustomer;
    }

    private async validateCustomerKeyAndName(transactionId: string, key: string, name: string): Promise<void> {
        const customersWithSameKey = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, key, undefined),
        );

        if (customersWithSameKey.length > 0) {
            throw new ConflictException(`Customer with key "${key}" already exists.`);
        }

        const customersWithSameName = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, undefined, name),
        );

        if (customersWithSameName.length > 0) {
            throw new ConflictException(`Customer with name "${name}" already exists.`);
        }
    }

    private async createAdminGroupPolicyIfNotExist(transactionId: string, customerName: string): Promise<void> {
        const adminGroupPolicyName = CustomerUtility.generateAdminGroupPolicyName(
            this.appConfigService.customer.groupPolicy.adminPrefix,
            customerName,
        );

        const adminGroupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(transactionId, 1, 1, adminGroupPolicyName),
        );

        if (adminGroupPolicies.length > 0) {
            return;
        }

        await this.commandBus.execute<CreateGroupPolicyCommand, GroupPolicy>(
            new CreateGroupPolicyCommand(transactionId, adminGroupPolicyName),
        );
    }
}
