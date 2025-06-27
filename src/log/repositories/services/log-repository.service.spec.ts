import { Between, DataSource, LessThan, MoreThan } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SortOrderType } from '../../../shared/enums';
import { LogRepositoryService } from './log-repository.service';

describe('LogRepositoryService', () => {
    let service: LogRepositoryService;
    let dataSource: DataSource;

    beforeEach(() => {
        jest.clearAllMocks();

        dataSource = {} as DataSource;
        service = new LogRepositoryService(dataSource);
    });

    describe('findByDateBetween', () => {
        it('should call findBy with the correct parameters (between)', async () => {
            const creationDateFrom = new Date('2023-01-01');
            const creationDateTo = new Date('2023-01-31');

            const pageNumber = 1;
            const pageSize = 10;
            const baseRepositoryFindByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'findBy')
                .mockReturnValue(Promise.resolve([]));

            await service.findByDateBetween(
                pageNumber,
                pageSize,
                creationDateFrom,
                creationDateTo,
                SortOrderType.Descending,
            );

            expect(baseRepositoryFindByMethod).toHaveBeenCalledWith(
                {
                    creationDate: Between(creationDateFrom, creationDateTo),
                },
                pageNumber,
                pageSize,
                {
                    creationDate: SortOrderType.Descending,
                },
            );
        });

        it('should call findBy with the correct parameters (more than)', async () => {
            const creationDateFrom = new Date('2023-01-01');
            const pageNumber = 1;
            const pageSize = 10;
            const baseRepositoryFindByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'findBy')
                .mockReturnValue(Promise.resolve([]));

            await service.findByDateBetween(pageNumber, pageSize, creationDateFrom, undefined);

            expect(baseRepositoryFindByMethod).toHaveBeenCalledWith(
                {
                    creationDate: MoreThan(creationDateFrom),
                },
                pageNumber,
                pageSize,
                undefined,
            );
        });

        it('should call findBy with the correct parameters (less than)', async () => {
            const creationDateTo = new Date('2023-01-31');
            const pageNumber = 1;
            const pageSize = 10;
            const baseRepositoryFindByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'findBy')
                .mockReturnValue(Promise.resolve([]));

            await service.findByDateBetween(pageNumber, pageSize, undefined, creationDateTo);

            expect(baseRepositoryFindByMethod).toHaveBeenCalledWith(
                {
                    creationDate: LessThan(creationDateTo),
                },
                pageNumber,
                pageSize,
                undefined,
            );
        });
    });
});
