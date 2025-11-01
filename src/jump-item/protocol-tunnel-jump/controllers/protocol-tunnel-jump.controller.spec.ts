import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../../shared/utilities';
import {
    CopyProtocolTunnelJumpCommand,
    CreateProtocolTunnelJumpCommand,
    DeleteProtocolTunnelJumpCommand,
    ModifyProtocolTunnelJumpCommand,
} from '../commands';
import { JumpGroupType } from '../enums';
import { ProtocolTunnelJump } from '../models';
import { RetrieveProtocolTunnelJumpsQuery } from '../queries';
import { ProtocolTunnelJumpController } from './protocol-tunnel-jump.controller';

describe('ProtocolTunnelJumpController', () => {
    let controller: ProtocolTunnelJumpController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new ProtocolTunnelJumpController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveProtocolTunnelJumps', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as ProtocolTunnelJump[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveProtocolTunnelJumps(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'protocol-tunnel-jump-1',
                hostname: 'hostname-1',
                jumpGroupType: JumpGroupType.Personal,
                jumpGroupIds: [2],
                jumpointId: 3,
                tag: 'tag-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveProtocolTunnelJumpsQuery(
                    'uuid-123',
                    123,
                    10,
                    1,
                    'protocol-tunnel-jump-1',
                    'hostname-1',
                    [2],
                    JumpGroupType.Personal,
                    3,
                    'tag-1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createProtocolTunnelJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as ProtocolTunnelJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createProtocolTunnelJump(undefined, 123, {
                name: 'protocol-tunnel-jump-2',
                jumpointId: 2,
                hostname: 'hostname-2',
                jumpGroupId: 3,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateProtocolTunnelJumpCommand('uuid-123', 123, 'protocol-tunnel-jump-2', 2, 'hostname-2', 3),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyProtocolTunnelJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as ProtocolTunnelJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyProtocolTunnelJump(undefined, 123, 1, {
                name: 'protocol-tunnel-jump-1',
                jumpointId: 1,
                hostname: 'hostname-1',
                jumpGroupId: 2,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyProtocolTunnelJumpCommand('uuid-123', 123, 1, 'protocol-tunnel-jump-1', 1, 'hostname-1', 2),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteProtocolTunnelJump', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteProtocolTunnelJump(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteProtocolTunnelJumpCommand('uuid-123', 123, 1));
        });
    });

    describe('copyProtocolTunnelJump', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as ProtocolTunnelJump;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.copyProtocolTunnelJump(undefined, 123, 1, {
                jumpGroupId: 2,
                jumpGroupType: JumpGroupType.Personal,
                name: 'copy-protocol-tunnel-jump-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CopyProtocolTunnelJumpCommand(
                    'uuid-123',
                    123,
                    1,
                    2,
                    JumpGroupType.Personal,
                    'copy-protocol-tunnel-jump-1',
                ),
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
