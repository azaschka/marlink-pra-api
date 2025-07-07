import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { PraUserRepositoryService } from './pra-user-repository.service';

describe('PraUserRepositoryService', () => {
    let service: PraUserRepositoryService;
    let dataSource: DataSource;

    beforeEach(() => {
        jest.clearAllMocks();

        dataSource = {} as DataSource;
        service = new PraUserRepositoryService(dataSource);
    });

    describe('createOrUpdateById', () => {
        it('should call createOrUpdate with the correct parameters', async () => {
            const entity = {
                username: 'testuser',
                password: 'password',
                role: 'Data Center Engineer',
                displayName: 'Test User',
            };
            const expectedConflictPaths = ['id'];
            const baseRepositoryCreateOrUpdateMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'createOrUpdate')
                .mockReturnValue(Promise.resolve());

            await service.createOrUpdateById(entity);

            expect(baseRepositoryCreateOrUpdateMethod).toHaveBeenCalledWith(entity, expectedConflictPaths);
        });
    });

    describe('findOneByUsername', () => {
        it('should call findOneBy with the correct parameters', async () => {
            const username = 'testuser';
            const expectedWhere = { username: username };
            const baseRepositoryFindOneByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'findOneBy')
                .mockReturnValue(Promise.resolve());

            await service.findOneByUsername(username);

            expect(baseRepositoryFindOneByMethod).toHaveBeenCalledWith(expectedWhere);
        });
    });

    describe('deleteById', () => {
        it('should call deleteBy with the correct parameters', async () => {
            const id = 1;
            const expectedWhere = { id: id };
            const baseRepositoryDeleteByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'deleteBy')
                .mockReturnValue(Promise.resolve());

            await service.deleteById(id);

            expect(baseRepositoryDeleteByMethod).toHaveBeenCalledWith(expectedWhere);
        });
    });
});
