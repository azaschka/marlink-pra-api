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
            const from = new Date('2023-01-01');
            const to = new Date('2023-01-31');
            const page = 1,
                size = 10;

            const spy = jest.spyOn(BaseRepositoryService.prototype, 'findBy').mockResolvedValue([]);

            await service.findByDateBetween(page, size, from, to, SortOrderType.Descending);

            expect(spy).toHaveBeenCalledWith({ creationDate: Between(from, to) }, page, size, {
                creationDate: SortOrderType.Descending,
            });
        });

        it('should call findBy with the correct parameters (more than)', async () => {
            const from = new Date('2023-01-01');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'findBy').mockResolvedValue([]);

            await service.findByDateBetween(1, 10, from, undefined);

            expect(spy).toHaveBeenCalledWith({ creationDate: MoreThan(from) }, 1, 10, undefined);
        });

        it('should call findBy with the correct parameters (less than)', async () => {
            const to = new Date('2023-01-31');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'findBy').mockResolvedValue([]);

            await service.findByDateBetween(1, 10, undefined, to);

            expect(spy).toHaveBeenCalledWith({ creationDate: LessThan(to) }, 1, 10, undefined);
        });
    });

    describe('countByDateBetween', () => {
        it('should call countBy with the correct parameters (between)', async () => {
            const from = new Date('2023-02-01');
            const to = new Date('2023-02-28');

            const spy = jest.spyOn(BaseRepositoryService.prototype, 'countBy').mockResolvedValue(42);

            await service.countByDateBetween(from, to);

            expect(spy).toHaveBeenCalledWith({ creationDate: Between(from, to) });
        });

        it('should call countBy with the correct parameters (more than)', async () => {
            const from = new Date('2023-03-01');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'countBy').mockResolvedValue(7);

            await service.countByDateBetween(from, undefined);

            expect(spy).toHaveBeenCalledWith({ creationDate: MoreThan(from) });
        });

        it('should call countBy with the correct parameters (less than)', async () => {
            const to = new Date('2023-03-31');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'countBy').mockResolvedValue(11);

            await service.countByDateBetween(undefined, to);

            expect(spy).toHaveBeenCalledWith({ creationDate: LessThan(to) });
        });
    });
});
