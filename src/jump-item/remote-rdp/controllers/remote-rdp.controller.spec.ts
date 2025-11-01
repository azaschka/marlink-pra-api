import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../../shared/utilities';
import {
    CopyRemoteRdpCommand,
    CreateRemoteRdpCommand,
    DeleteRemoteRdpCommand,
    ModifyRemoteRdpCommand,
} from '../commands';
import { JumpGroupType } from '../enums';
import { RemoteRdp } from '../models';
import { RetrieveRemoteRdpsQuery } from '../queries';
import { RemoteRdpController } from './remote-rdp.controller';

describe('RemoteRdpController', () => {
    let controller: RemoteRdpController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new RemoteRdpController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveRemoteRdps', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as RemoteRdp[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveRemoteRdps(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'remote-rdp-1',
                hostname: 'hostname-1',
                jumpGroupType: JumpGroupType.Personal,
                endpointId: 1,
                jumpGroupIds: [2],
                jumpointId: 3,
                tag: 'tag-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveRemoteRdpsQuery(
                    'uuid-123',
                    123,
                    10,
                    1,
                    'remote-rdp-1',
                    'hostname-1',
                    [2],
                    JumpGroupType.Personal,
                    3,
                    1,
                    'tag-1',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createRemoteRdp', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as RemoteRdp;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createRemoteRdp(undefined, 123, {
                name: 'remote-rdp-2',
                jumpointId: 2,
                hostname: 'hostname-2',
                jumpGroupId: 3,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateRemoteRdpCommand('uuid-123', 123, 'remote-rdp-2', 2, 'hostname-2', 3),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyRemoteRdp', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as RemoteRdp;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyRemoteRdp(undefined, 123, 1, {
                name: 'remote-rdp-1',
                jumpointId: 1,
                hostname: 'hostname-1',
                jumpGroupId: 2,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyRemoteRdpCommand('uuid-123', 123, 1, 'remote-rdp-1', 1, 'hostname-1', 2),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteRemoteRdp', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteRemoteRdp(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteRemoteRdpCommand('uuid-123', 123, 1));
        });
    });

    describe('copyRemoteRdp', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as RemoteRdp;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.copyRemoteRdp(undefined, 123, 1, {
                jumpGroupId: 2,
                jumpGroupType: JumpGroupType.Personal,
                name: 'copy-remote-rdp-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CopyRemoteRdpCommand('uuid-123', 123, 1, 2, JumpGroupType.Personal, 'copy-remote-rdp-1'),
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
