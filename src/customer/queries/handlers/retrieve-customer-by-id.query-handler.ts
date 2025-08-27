import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Customer } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { RetrieveCustomerByIdQuery } from '../retrieve-customer-by-id.query';

@QueryHandler(RetrieveCustomerByIdQuery)
export class RetrieveCustomerByIdQueryHandler implements IQueryHandler<RetrieveCustomerByIdQuery> {
    constructor(private readonly customerRepositoryService: CustomerRepositoryService) {}

    public async execute(query: RetrieveCustomerByIdQuery): Promise<Customer> {
        const customer = await this.customerRepositoryService.findOneById(query.customerId);

        if (!customer) {
            throw new NotFoundException(`Customer with id ${query.customerId} not found`);
        }

        return customer;
    }
}
