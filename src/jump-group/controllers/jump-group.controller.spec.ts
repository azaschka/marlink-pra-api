import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateJumpGroupCommand, DeleteJumpGroupCommand, ModifyJumpGroupCommand } from '../commands';
import { JumpGroup } from '../models';
import { RetrieveJumpGroupsQuery } from '../queries';
import { JumpGroupController } from './jump-group.controller';

describe('JumpGroupController', () => {
    let controller: JumpGroupController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new JumpGroupController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpGroups', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as JumpGroup[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpGroups(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'jump-group-1',
                codeName: 'jump-group-code-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveJumpGroupsQuery('uuid-123', 123, 10, 1, 'jump-group-1', 'jump-group-code-1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createJumpGroup', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpGroup;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createJumpGroup(undefined, 123, {
                name: 'jump-group-1',
                codeName: 'jump-group-code-1',
                comments: 'jump group comments 1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateJumpGroupCommand(
                    'uuid-123',
                    123,
                    'jump-group-1',
                    'jump-group-code-1',
                    'jump group comments 1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyJumpGroup', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpGroup;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyJumpGroup(undefined, 123, 1, {
                name: 'jump-group-1',
                codeName: 'jump-group-code-1',
                comments: 'jump group comments 1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyJumpGroupCommand(
                    'uuid-123',
                    123,
                    1,
                    'jump-group-1',
                    'jump-group-code-1',
                    'jump group comments 1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteJumpGroup', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteJumpGroup('uuid-100', 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteJumpGroupCommand('uuid-100', 123, 1));
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
