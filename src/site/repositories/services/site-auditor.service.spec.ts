import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteAuditorRepositoryService } from './site-auditor.service';

describe('SiteAuditorRepositoryService', () => {
    let service: SiteAuditorRepositoryService;
    let dataSource: DataSource;

    beforeEach(() => {
        jest.clearAllMocks();

        dataSource = {} as DataSource;
        service = new SiteAuditorRepositoryService(dataSource);
    });

    describe('createOrUpdateById', () => {
        it('should call createOrUpdate with the correct parameters', async () => {
            const entity = { id: 1, name: 'Test site' };
            const expectedConflictPaths = ['id'];
            const baseRepositoryCreateOrUpdateMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'createOrUpdate')
                .mockReturnValue(Promise.resolve());

            await service.createOrUpdateById(entity);

            expect(baseRepositoryCreateOrUpdateMethod).toHaveBeenCalledWith(entity, expectedConflictPaths);
        });
    });

    describe('findOneById', () => {
        it('should call findOneBy with the correct parameters', async () => {
            const id = 1;
            const expectedWhere = { id: id };
            const baseRepositoryFindOneByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'findOneBy')
                .mockReturnValue(Promise.resolve());

            await service.findOneById(id);

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
