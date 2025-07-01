import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Customer } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { RetrieveCustomersQuery } from '../retrieve-customers.query';

@QueryHandler(RetrieveCustomersQuery)
export class RetrieveCustomersQueryHandler implements IQueryHandler<RetrieveCustomersQuery> {
    constructor(private readonly customerRepositoryService: CustomerRepositoryService) {}

    public async execute(query: RetrieveCustomersQuery): Promise<Customer[]> {
        const customerFindByQuery = <Customer>{};

        if (query.key) {
            customerFindByQuery.key = query.key;
        }

        if (query.name) {
            customerFindByQuery.name = query.name;
        }

        const customers = await this.customerRepositoryService.findBy(
            customerFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return customers;
    }
}
