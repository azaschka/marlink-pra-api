import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../../shared/utilities';
import {
    CopyShellJumpCommand,
    CreateShellJumpCommand,
    DeleteShellJumpCommand,
    ModifyShellJumpCommand,
} from '../commands';
import { JumpGroupType, ShellJumpProtocolType } from '../enums';
import { ShellJump } from '../models';
import { RetrieveShellJumpsQuery } from '../queries';
import { ShellJumpController } from './shell-jump.controller';

describe('ShellJumpController', () => {
    let controller: ShellJumpController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new ShellJumpController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveShellJumps', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as ShellJump[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveShellJumps(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'shell-jump-1',
                hostname: 'hostname-1',
                jumpGroupType: JumpGroupType.Personal,
                jumpGroupId: 2,
                jumpointId: 3,
                tag: 'tag-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveShellJumpsQuery(
                    'uuid-123',
                    123,
                    10,
                    1,
                    'shell-jump-1',
                    'hostname-1',
                    2,
                    JumpGroupType.Personal,
                    3,
                    'tag-1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createShellJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as ShellJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createShellJump(undefined, 123, {
                name: 'shell-jump-2',
                jumpointId: 2,
                hostname: 'hostname-2',
                jumpGroupId: 3,
                protocolType: ShellJumpProtocolType.SSH,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateShellJumpCommand(
                    'uuid-123',
                    123,
                    'shell-jump-2',
                    2,
                    'hostname-2',
                    ShellJumpProtocolType.SSH,
                    undefined,
                    3,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyShellJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as ShellJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyShellJump(undefined, 123, 1, {
                name: 'shell-jump-1',
                jumpointId: 1,
                hostname: 'hostname-1',
                jumpGroupId: 2,
                port: 22,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyShellJumpCommand('uuid-123', 123, 1, 'shell-jump-1', 1, 'hostname-1', undefined, 22, 2),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteShellJump', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteShellJump(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteShellJumpCommand('uuid-123', 123, 1));
        });
    });

    describe('copyShellJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as ShellJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.copyShellJump(undefined, 123, 1, {
                jumpGroupId: 2,
                jumpGroupType: JumpGroupType.Personal,
                name: 'copy-shell-jump-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CopyShellJumpCommand('uuid-123', 123, 1, 2, JumpGroupType.Personal, 'copy-shell-jump-1'),
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
