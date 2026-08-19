import { QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { RetrieveSocJumpItemsQuery, RetrieveSocJumpointsQuery } from '../queries';
import { SocController } from './soc.controller';

describe('SocController', () => {
    let controller: SocController;
    let queryBus: QueryBus;

    beforeEach(() => {
        queryBus = mockQueryBus();
        controller = new SocController(queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveSocJumpItems', () => {
        it('should call queryBus.execute with the correct parameters and return the result', async () => {
            const transactionId = 'uuid-123';
            const tenantId = 1;
            const query = {
                pageSize: 10,
                pageNumber: 1,
            };
            const body = {
                customerSiteInfo: [{ customerKey: 'customer-1', siteKey: 'site-1' }],
            };
            const expectedResult = [{ id: 1, name: 'Jump Item 1' }];
            const executeSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveSocJumpItems(transactionId, tenantId, query, body);

            expect(executeSpy).toHaveBeenCalledWith(
                new RetrieveSocJumpItemsQuery(
                    transactionId,
                    tenantId,
                    query.pageSize,
                    query.pageNumber,
                    body.customerSiteInfo,
                ),
            );
            expect(result).toEqual(expectedResult);
        });
    });

    describe('retrieveSocJumpoints', () => {
        it('should call queryBus.execute with the correct parameters and return the result', async () => {
            const transactionId = 'uuid-123';
            const tenantId = 1;
            const query = {
                pageSize: 10,
                pageNumber: 1,
            };
            const body = {
                customerSiteInfo: [{ customerKey: 'customer-1', siteKey: 'site-1' }],
            };
            const expectedResult = [{ id: 1, name: 'Jumpoint 1' }];
            const executeSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveSocJumpoints(transactionId, tenantId, query, body);

            expect(executeSpy).toHaveBeenCalledWith(
                new RetrieveSocJumpointsQuery(
                    transactionId,
                    tenantId,
                    query.pageSize,
                    query.pageNumber,
                    body.customerSiteInfo,
                ),
            );
            expect(result).toEqual(expectedResult);
        });
    });
});

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}
