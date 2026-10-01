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

            await service.findByDateBetween(page, size, undefined, from, to, SortOrderType.Descending);

            expect(spy).toHaveBeenCalledWith([{ creationDate: Between(from, to) }], page, size, {
                creationDate: SortOrderType.Descending,
            });
        });

        it('should call findBy with the correct parameters (more than)', async () => {
            const from = new Date('2023-01-01');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'findBy').mockResolvedValue([]);

            await service.findByDateBetween(1, 10, undefined, from, undefined);

            expect(spy).toHaveBeenCalledWith([{ creationDate: MoreThan(from) }], 1, 10, undefined);
        });

        it('should call findBy with the correct parameters (less than)', async () => {
            const to = new Date('2023-01-31');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'findBy').mockResolvedValue([]);

            await service.findByDateBetween(1, 10, undefined, undefined, to);

            expect(spy).toHaveBeenCalledWith([{ creationDate: LessThan(to) }], 1, 10, undefined);
        });
    });

    describe('countByDateBetween', () => {
        it('should call countBy with the correct parameters (between)', async () => {
            const from = new Date('2023-02-01');
            const to = new Date('2023-02-28');

            const spy = jest.spyOn(BaseRepositoryService.prototype, 'countBy').mockResolvedValue(42);

            await service.countByDateBetween(undefined, from, to);

            expect(spy).toHaveBeenCalledWith([{ creationDate: Between(from, to) }]);
        });

        it('should call countBy with the correct parameters (more than)', async () => {
            const from = new Date('2023-03-01');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'countBy').mockResolvedValue(7);

            await service.countByDateBetween(undefined, from, undefined);

            expect(spy).toHaveBeenCalledWith([{ creationDate: MoreThan(from) }]);
        });

        it('should call countBy with the correct parameters (less than)', async () => {
            const to = new Date('2023-03-31');
            const spy = jest.spyOn(BaseRepositoryService.prototype, 'countBy').mockResolvedValue(11);

            await service.countByDateBetween(undefined, undefined, to);

            expect(spy).toHaveBeenCalledWith([{ creationDate: LessThan(to) }]);
        });
    });

    describe('deleteByDateBetween (batched)', () => {
        let query: jest.Mock;

        beforeEach(() => {
            query = jest.fn().mockResolvedValue({ affectedRows: 0 });
            service = new LogRepositoryService({ query } as unknown as DataSource);
        });

        it.each([
            {
                name: 'between (inclusive)',
                from: new Date('2023-04-01'),
                to: new Date('2023-04-30'),
                tenantId: undefined,
                sql: '`creation_date` BETWEEN ? AND ?',
                parameters: [new Date('2023-04-01'), new Date('2023-04-30')],
            },
            {
                name: 'more than',
                from: new Date('2023-05-01'),
                to: undefined,
                tenantId: undefined,
                sql: '`creation_date` > ?',
                parameters: [new Date('2023-05-01')],
            },
            {
                name: 'less than, for one tenant',
                from: undefined,
                to: new Date('2023-05-31'),
                tenantId: 7,
                sql: "`creation_date` < ? AND JSON_EXTRACT(`payload`, '$.tenantId') = ?",
                parameters: [new Date('2023-05-31'), 7],
            },
        ])('keeps the conditions ($name)', async ({ from, to, tenantId, sql, parameters }) => {
            await service.deleteByDateBetween(from, to, tenantId);

            expect(query).toHaveBeenCalledWith(
                `DELETE FROM \`pra_logs\` WHERE ${sql} ORDER BY \`creation_date\` LIMIT 5000`,
                parameters,
            );
        });

        it('deletes in batches of 5,000 until a batch is not full', async () => {
            query
                .mockResolvedValueOnce({ affectedRows: 5000 })
                .mockResolvedValueOnce({ affectedRows: 5000 })
                .mockResolvedValueOnce({ affectedRows: 1234 });

            await service.deleteByDateBetween(undefined, new Date('2023-05-31'));

            expect(query).toHaveBeenCalledTimes(3);
        });
    });
});
