import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BusinessUnit } from '../../customer/enums';
import { UuidUtility } from '../../shared/utilities';
import { CreateAccessCommand, DeleteAccessCommand, ModifyAccessCommand } from '../commands';
import { Access } from '../models';
import { RetrieveAccessQuery } from '../queries';
import { AccessController } from './access.controller';

describe('AccessController', () => {
    let controller: AccessController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new AccessController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveAccess', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Access[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveAccess(undefined, {
                pageSize: 10,
                pageNumber: 1,
                key: 'access-1',
                name: 'access 1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveAccessQuery('uuid-123', 10, 1, 'access-1', 'access 1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createAccess', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Access;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createAccess(undefined, {
                key: 'access-1',
                name: 'access 1',
                value: {
                    businessUnits: [BusinessUnit.EG, BusinessUnit.MC],
                },
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateAccessCommand('uuid-123', 'access-1', 'access 1', {
                    businessUnits: [BusinessUnit.EG, BusinessUnit.MC],
                }),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyAccess', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Access;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyAccess('uuid-123', 1, {
                key: 'access-1',
                name: 'access 1',
                value: {
                    businessUnits: [BusinessUnit.EG, BusinessUnit.MC],
                },
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyAccessCommand('uuid-123', 1, 'access-1', 'access 1', {
                    businessUnits: [BusinessUnit.EG, BusinessUnit.MC],
                }),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteAccess', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteAccess('uuid-123', 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteAccessCommand('uuid-123', 1));
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
