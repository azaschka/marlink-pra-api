import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../../shared/utilities';
import {
    CopyRemoteVncCommand,
    CreateRemoteVncCommand,
    DeleteRemoteVncCommand,
    ModifyRemoteVncCommand,
} from '../commands';
import { JumpGroupType } from '../enums';
import { RemoteVnc } from '../models';
import { RetrieveRemoteVncsQuery } from '../queries';
import { RemoteVncController } from './remote-vnc.controller';

describe('RemoteVncController', () => {
    let controller: RemoteVncController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new RemoteVncController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveRemoteVncs', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as RemoteVnc[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveRemoteVncs(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'remote-vnc-1',
                hostname: 'hostname-1',
                jumpGroupType: JumpGroupType.Personal,
                jumpGroupId: 2,
                jumpointId: 3,
                tag: 'tag-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveRemoteVncsQuery(
                    'uuid-123',
                    123,
                    10,
                    1,
                    'remote-vnc-1',
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

    describe('createRemoteVnc', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as RemoteVnc;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createRemoteVnc(undefined, 123, {
                name: 'remote-vnc-2',
                jumpointId: 2,
                hostname: 'hostname-2',
                jumpGroupId: 3,
                port: 2000,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateRemoteVncCommand('uuid-123', 123, 'remote-vnc-2', 2, 'hostname-2', 2000, 3),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyRemoteVnc', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as RemoteVnc;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyRemoteVnc(undefined, 123, 1, {
                name: 'remote-vnc-1',
                jumpointId: 1,
                hostname: 'hostname-1',
                jumpGroupId: 2,
                port: 2000,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyRemoteVncCommand('uuid-123', 123, 1, 'remote-vnc-1', 1, 'hostname-1', 2000, 2),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteRemoteVnc', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteRemoteVnc(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteRemoteVncCommand('uuid-123', 123, 1));
        });
    });

    describe('copyRemoteVnc', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as RemoteVnc;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.copyRemoteVnc(undefined, 123, 1, {
                jumpGroupId: 2,
                jumpGroupType: JumpGroupType.Personal,
                name: 'copy-remote-vnc-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CopyRemoteVncCommand('uuid-123', 123, 1, 2, JumpGroupType.Personal, 'copy-remote-vnc-1'),
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
