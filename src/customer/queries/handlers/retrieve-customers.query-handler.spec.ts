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
        it('should call the repo with page size and page number; and return value from the repo', async () => {
            const expectedCustomers = [] as CustomerEntity[];
            const customerRepositoryServiceFindByMethod = jest
                .spyOn(customerRepositoryService, 'findBy')
                .mockResolvedValue(expectedCustomers);

            const result = await handler.execute(new RetrieveCustomersQuery('transaction-1', 20, 2));

            expect(result).toBe(expectedCustomers);
            expect(customerRepositoryServiceFindByMethod).toHaveBeenCalledWith({}, 2, 20);
        });

        it('should call the repo with correct parameter and return value from the repo', async () => {
            const expectedCustomers = [] as CustomerEntity[];
            const customerRepositoryServiceFindByMethod = jest
                .spyOn(customerRepositoryService, 'findBy')
                .mockResolvedValue(expectedCustomers);

            const result = await handler.execute(
                new RetrieveCustomersQuery('transaction-2', 10, 1, 'customer-key-1', 'customer-name-1'),
            );

            expect(result).toBe(expectedCustomers);
            expect(customerRepositoryServiceFindByMethod).toHaveBeenCalledWith(
                {
                    key: 'customer-key-1',
                    name: 'customer-name-1',
                },
                1,
                10,
            );
        });
    });
});

function mockCustomerRepositoryService() {
    const service = {} as CustomerRepositoryService;
    service.findBy = jest.fn();

    return service;
}
