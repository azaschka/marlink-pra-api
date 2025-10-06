import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../../shared/utilities';
import { CopyWebJumpCommand, CreateWebJumpCommand, DeleteWebJumpCommand, ModifyWebJumpCommand } from '../commands';
import { JumpGroupType } from '../enums';
import { WebJump } from '../models';
import { RetrieveWebJumpsQuery } from '../queries';
import { WebJumpController } from './web-jump.controller';

describe('WebJumpController', () => {
    let controller: WebJumpController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new WebJumpController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveWebJumps', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as WebJump[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveWebJumps(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'web-jump-1',
                url: 'url-1',
                jumpGroupType: JumpGroupType.Personal,
                jumpGroupId: 2,
                jumpointId: 3,
                tag: 'tag-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveWebJumpsQuery(
                    'uuid-123',
                    123,
                    10,
                    1,
                    'web-jump-1',
                    'url-1',
                    2,
                    JumpGroupType.Personal,
                    3,
                    'tag-1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createWebJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as WebJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createWebJump(undefined, 123, {
                name: 'web-jump-2',
                jumpointId: 2,
                url: 'url-2',
                jumpGroupId: 3,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateWebJumpCommand('uuid-123', 123, 'web-jump-2', 2, 'url-2', 3),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyWebJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as WebJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyWebJump(undefined, 123, 1, {
                name: 'web-jump-1',
                jumpointId: 1,
                url: 'url-1',
                jumpGroupId: 2,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyWebJumpCommand('uuid-123', 123, 1, 'web-jump-1', 1, 'url-1', 2),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteWebJump', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteWebJump(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteWebJumpCommand('uuid-123', 123, 1));
        });
    });

    describe('copyWebJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as WebJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.copyWebJump(undefined, 123, 1, {
                jumpGroupId: 2,
                jumpGroupType: JumpGroupType.Personal,
                name: 'copy-web-jump-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CopyWebJumpCommand('uuid-123', 123, 1, 2, JumpGroupType.Personal, 'copy-web-jump-1'),
            );
            expect(result).toBe(expectedResult);
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
