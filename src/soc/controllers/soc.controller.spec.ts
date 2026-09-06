import { QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { SocCustomerSiteMappingStatus } from '../enums';
import { SocFilterDtoInput } from '../dtos/inputs';
import { SocJumpItem, SocJumpoint, SocScope } from '../models';
import { RetrieveSocJumpItemsQuery, RetrieveSocJumpointsQuery } from '../queries';
import { SocController } from './soc.controller';

describe('SocController', () => {
    const transactionId = 'uuid-123';
    const tenantId = 1;

    let controller: SocController;
    let queryBus: QueryBus;

    beforeEach(() => {
        queryBus = mockQueryBus();
        controller = new SocController(queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => transactionId);
    });

    describe('retrieveSocJumpItems', () => {
        it('should forward the filters and the restricted scope and wrap the result in a paginated envelope', async () => {
            const query = filterDto({
                pageSize: 10,
                pageNumber: 2,
                customerKey: 'customer-1',
                siteKey: 'site-1',
                mappingStatus: SocCustomerSiteMappingStatus.CustomerAndSite,
            });
            const scope: SocScope = { isPlatformWide: false, customerKeys: ['customer-1', 'customer-2'] };
            const items = [{ jumpItemType: 'shell-jump' }] as unknown as SocJumpItem[];
            const executeSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue({ items, totalCount: 35 });

            const result = await controller.retrieveSocJumpItems(transactionId, tenantId, query, scope);

            expect(executeSpy).toHaveBeenCalledWith(
                new RetrieveSocJumpItemsQuery(
                    transactionId,
                    tenantId,
                    10,
                    2,
                    'customer-1',
                    'site-1',
                    SocCustomerSiteMappingStatus.CustomerAndSite,
                    ['customer-1', 'customer-2'],
                ),
            );
            expect(result).toEqual({
                items,
                pagination: { pageNumber: 2, pageSize: 10, totalCount: 35, totalPages: 4 },
            });
        });

        it('should not restrict the customers when the access key is platform-wide', async () => {
            const query = filterDto({ pageSize: 100, pageNumber: 1 });
            const scope: SocScope = { isPlatformWide: true, customerKeys: [] };
            const executeSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue({ items: [], totalCount: 0 });

            await controller.retrieveSocJumpItems(transactionId, tenantId, query, scope);

            expect(executeSpy).toHaveBeenCalledWith(
                new RetrieveSocJumpItemsQuery(
                    transactionId,
                    tenantId,
                    100,
                    1,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ),
            );
        });

        it('should report zero pages when nothing matches the query', async () => {
            const query = filterDto({ pageSize: 25, pageNumber: 1 });
            const scope: SocScope = { isPlatformWide: true, customerKeys: [] };
            jest.spyOn(queryBus, 'execute').mockResolvedValue({ items: [], totalCount: 0 });

            const result = await controller.retrieveSocJumpItems(transactionId, tenantId, query, scope);

            expect(result.pagination).toEqual({ pageNumber: 1, pageSize: 25, totalCount: 0, totalPages: 0 });
        });
    });

    describe('retrieveSocJumpoints', () => {
        it('should forward the filters and the scope and wrap the result in a paginated envelope', async () => {
            const query = filterDto({
                pageSize: 50,
                pageNumber: 1,
                mappingStatus: SocCustomerSiteMappingStatus.Unmapped,
            });
            const scope: SocScope = { isPlatformWide: true, customerKeys: [] };
            const items = [{ jumpoint: { id: 7 } }] as unknown as SocJumpoint[];
            const executeSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue({ items, totalCount: 3 });

            const result = await controller.retrieveSocJumpoints(transactionId, tenantId, query, scope);

            expect(executeSpy).toHaveBeenCalledWith(
                new RetrieveSocJumpointsQuery(
                    transactionId,
                    tenantId,
                    50,
                    1,
                    undefined,
                    undefined,
                    SocCustomerSiteMappingStatus.Unmapped,
                    undefined,
                ),
            );
            expect(result).toEqual({
                items,
                pagination: { pageNumber: 1, pageSize: 50, totalCount: 3, totalPages: 1 },
            });
        });
    });
});

function filterDto(overrides: Partial<SocFilterDtoInput>): SocFilterDtoInput {
    return { pageSize: 100, pageNumber: 1, ...overrides } as SocFilterDtoInput;
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}
