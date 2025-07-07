import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CopyJumpClientCommand, DeleteJumpClientCommand, ModifyJumpClientCommand } from '../commands';
import { JumpClientConnectionType, JumpClientEndpointAgreementPolicyType, JumpClientGroupType } from '../enums';
import { JumpClient } from '../models';
import { RetrieveJumpClientsQuery } from '../queries';
import { JumpClientController } from './jump-client.controller';

describe('JumpClientController', () => {
    let controller: JumpClientController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new JumpClientController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpClients', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as JumpClient[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpClients('uuid-100', {
                pageSize: 10,
                pageNumber: 1,
                name: 'jump-client-1',
                hostname: 'hostname-1',
                fqdn: 'fqdn-1',
                tag: 'tag-1',
                jumpGroupId: 123,
                jumpGroupType: JumpClientGroupType.Personal,
                connectionType: JumpClientConnectionType.Passive,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveJumpClientsQuery(
                    'uuid-100',
                    10,
                    1,
                    'jump-client-1',
                    'hostname-1',
                    'fqdn-1',
                    'tag-1',
                    123,
                    JumpClientGroupType.Personal,
                    undefined,
                    undefined,
                    undefined,
                    JumpClientConnectionType.Passive,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyJumpClient', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpClient;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyJumpClient('uuid-100', 1, {
                jumpGroupId: 123,
                jumpGroupType: JumpClientGroupType.Personal,
                name: 'name-1',
                tag: 'tag-1',
                comments: 'comments-1',
                jumpPolicyId: 456,
                sessionPolicyId: 789,
                maxOfflineDurationInMinutes: 0,
                endpointAgreementPolicyType: JumpClientEndpointAgreementPolicyType.NoPrompt,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyJumpClientCommand(
                    'uuid-100',
                    1,
                    123,
                    JumpClientGroupType.Personal,
                    'name-1',
                    'tag-1',
                    'comments-1',
                    456,
                    789,
                    0,
                    JumpClientEndpointAgreementPolicyType.NoPrompt,
                ),
            );

            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteJumpClient', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteJumpClient(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteJumpClientCommand('uuid-123', 1));
        });
    });

    describe('copyJumpClient', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpClient;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.copyJumpClient(undefined, 1, {
                jumpGroupId: 123,
                jumpGroupType: JumpClientGroupType.Personal,
                name: 'jump-client-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CopyJumpClientCommand('uuid-123', 1, 123, JumpClientGroupType.Personal, 'jump-client-1'),
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
