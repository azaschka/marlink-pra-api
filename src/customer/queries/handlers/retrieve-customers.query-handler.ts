import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere, In, Like } from 'typeorm';
import { Customer } from '../../models';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { RetrieveCustomersQuery } from '../retrieve-customers.query';

@QueryHandler(RetrieveCustomersQuery)
export class RetrieveCustomersQueryHandler implements IQueryHandler<RetrieveCustomersQuery> {
    constructor(private readonly customerRepositoryService: CustomerRepositoryService) {}

    public async execute(query: RetrieveCustomersQuery): Promise<Customer[]> {
        const customerFindByQuery = <FindOptionsWhere<Customer>>{};

        if (query.key) {
            customerFindByQuery.key = query.key;
        }

        if (query.name) {
            customerFindByQuery.name = query.name;
        }

        if (query.namePattern) {
            customerFindByQuery.name = Like(query.namePattern);
        }

        if (query.businessUnits && query.businessUnits.length > 0) {
            customerFindByQuery.businessUnit = In(query.businessUnits);
        }

        const customers = await this.customerRepositoryService.findBy(
            customerFindByQuery as FindOptionsWhere<CustomerEntity>,
            query.pageNumber,
            query.pageSize,
        );

        return customers;
    }
}
