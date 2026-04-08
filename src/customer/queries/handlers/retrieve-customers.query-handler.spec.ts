import { In, Like } from 'typeorm';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { RetrieveCustomersQuery } from '../retrieve-customers.query';
import { RetrieveCustomersQueryHandler } from './retrieve-customers.query-handler';

describe('RetrieveCustomersQueryHandler', () => {
    let customerRepositoryService: CustomerRepositoryService;
    let handler: RetrieveCustomersQueryHandler;

    beforeEach(() => {
        customerRepositoryService = mockCustomerRepositoryService();
        handler = new RetrieveCustomersQueryHandler(customerRepositoryService);
    });

    describe('execute', () => {
        it.each([
            {
                query: new RetrieveCustomersQuery('transaction-2', 10, 1),
                expectedFindByQuery: {},
            },
            {
                query: new RetrieveCustomersQuery('transaction-2', 10, 1, 'customer-key-1'),
                expectedFindByQuery: { key: 'customer-key-1' },
            },
            {
                query: new RetrieveCustomersQuery('transaction-2', 10, 1, undefined, 'customer-name-1'),
                expectedFindByQuery: { name: 'customer-name-1' },
            },
            {
                query: new RetrieveCustomersQuery('transaction-2', 10, 1, undefined, undefined, 'customer-name%', [
                    BusinessUnit.MC,
                    BusinessUnit.EG,
                ]),
                expectedFindByQuery: {
                    name: Like('customer-name%'),
                    beyondtrustInstance: { businessUnit: In([BusinessUnit.MC, BusinessUnit.EG]) },
                },
            },
        ])(
            'should call the repo with correct parameter and return value from the repo',
            async ({ query, expectedFindByQuery }) => {
                const expectedCustomers = [] as CustomerEntity[];
                const customerRepositoryServiceFindByMethod = jest
                    .spyOn(customerRepositoryService, 'findBy')
                    .mockResolvedValue(expectedCustomers);

                const result = await handler.execute(query);

                expect(result).toBe(expectedCustomers);
                expect(customerRepositoryServiceFindByMethod).toHaveBeenCalledWith(expectedFindByQuery, 1, 10);
            },
        );
    });
});

function mockCustomerRepositoryService() {
    const service = {} as CustomerRepositoryService;
    service.findBy = jest.fn();

    return service;
}
