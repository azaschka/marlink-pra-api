import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateSiteCommand, DeleteSiteCommand, ModifySiteCommand } from '../commands';
import { Site } from '../models';
import { RetrieveSitesQuery } from '../queries';
import { SiteController } from './site.controller';

describe('SiteController', () => {
    let controller: SiteController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new SiteController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveSites', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Site[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveSites(undefined, {
                pageSize: 10,
                pageNumber: 1,
                key: 'key-1',
                name: 'name-1',
                customerKey: 'customer-key-1',
                customerName: 'customer-name-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveSitesQuery('uuid-123', 10, 1, 'key-1', 'name-1', 'customer-key-1', 'customer-name-1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createSite', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Site;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createSite(undefined, {
                key: 'key-1',
                name: 'name-1',
                customerKey: 'customer-key-1',
                customerName: 'customer-name-1',
                approverUsername: 'approver-username-1',
                approverEmail: 'approver-email-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateSiteCommand(
                    'uuid-123',
                    'key-1',
                    'name-1',
                    'customer-key-1',
                    'customer-name-1',
                    'approver-username-1',
                    'approver-email-1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifySite', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Site;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifySite('uuid-123', 1, {
                customerKey: 'customer-key-1',
                customerName: 'customer-name-1',
                approverUsername: 'approver-username-1',
                approverEmail: 'approver-email-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifySiteCommand(
                    'uuid-123',
                    1,
                    'customer-key-1',
                    'customer-name-1',
                    'approver-username-1',
                    'approver-email-1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteSite', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteSite('uuid-123', 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteSiteCommand('uuid-123', 1));
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}
