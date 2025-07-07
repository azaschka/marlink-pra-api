import { PraUserEntity } from '../../repositories/entities';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { RetrievePraUsersQuery } from '../retrieve-pra-users.query';
import { RetrievePraUsersQueryHandler } from './retrieve-pra-users.query-handler';

describe('RetrievePraUsersQueryHandler', () => {
    let praUserRepositoryService: PraUserRepositoryService;
    let handler: RetrievePraUsersQueryHandler;

    beforeEach(() => {
        praUserRepositoryService = mockPraUserRepositoryService();
        handler = new RetrievePraUsersQueryHandler(praUserRepositoryService);
    });

    describe('execute', () => {
        it('should call the repo with page size and page number; and return value from the repo', async () => {
            const expectedUsers = [] as PraUserEntity[];
            const praUserRepositoryServiceFindByMethod = jest
                .spyOn(praUserRepositoryService, 'findBy')
                .mockResolvedValue(expectedUsers);

            const result = await handler.execute(new RetrievePraUsersQuery('transaction-1', 20, 2));

            expect(result).toBe(expectedUsers);
            expect(praUserRepositoryServiceFindByMethod).toHaveBeenCalledWith({}, 2, 20);
        });

        it('should call the repo with correct parameter and return value from the repo', async () => {
            const expectedUsers = [] as PraUserEntity[];
            const praUserRepositoryServiceFindByMethod = jest
                .spyOn(praUserRepositoryService, 'findBy')
                .mockResolvedValue(expectedUsers);

            const result = await handler.execute(
                new RetrievePraUsersQuery('transaction-2', 10, 1, 42, 'test-username'),
            );

            expect(result).toBe(expectedUsers);
            expect(praUserRepositoryServiceFindByMethod).toHaveBeenCalledWith(
                {
                    id: 42,
                    username: 'test-username',
                },
                1,
                10,
            );
        });
    });
});

function mockPraUserRepositoryService() {
    const service = {} as PraUserRepositoryService;
    service.findBy = jest.fn();

    return service;
}
