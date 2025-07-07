import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateJumpClientInstallerCommand, DeleteJumpClientInstallerCommand } from '../commands';
import { JumpClientConnectionType, JumpClientGroupType } from '../enums';
import { JumpClientInstaller } from '../models';
import { RetrieveJumpClientInstallersQuery } from '../queries';
import { JumpClientInstallerController } from './jump-client-installer.controller';

describe('JumpClientInstallerController', () => {
    let controller: JumpClientInstallerController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new JumpClientInstallerController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpClientInstallers', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as JumpClientInstaller[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpClientInstallers('uuid-100', {
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
                new RetrieveJumpClientInstallersQuery(
                    'uuid-100',
                    10,
                    1,
                    'jump-client-1',
                    'hostname-1',
                    'fqdn-1',
                    'tag-1',
                    123,
                    JumpClientGroupType.Personal,
                    JumpClientConnectionType.Passive,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createJumpClientInstaller', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpClientInstaller;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createJumpClientInstaller('uuid-100', {
                name: 'jump-client-1',
                jumpGroupId: 1,
                jumpGroupType: JumpClientGroupType.Personal,
                jumpPolicyId: 3,
                tag: 'tag-1',
                connectionType: JumpClientConnectionType.Passive,
                sessionPolicyId: 4,
                comments: 'comments-1',
                validDurationInMinutes: 60,
                shouldElevateInstall: true,
                shouldElevatePrompt: false,
                canOverrideJumpGroup: true,
                canOverrideJumpPolicy: false,
                canOverrideName: true,
                canOverrideTag: false,
                canOverrideComments: true,
                canOverrideSessionPolicy: false,
                jumpointProxy: 'jumpoint-proxy-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateJumpClientInstallerCommand(
                    'uuid-100',
                    1,
                    'jump-client-1',
                    JumpClientGroupType.Personal,
                    3,
                    'tag-1',
                    JumpClientConnectionType.Passive,
                    4,
                    'comments-1',
                    60,
                    true,
                    false,
                    true,
                    false,
                    true,
                    false,
                    true,
                    false,
                    'jumpoint-proxy-1',
                ),
            );

            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteJumpClientInstaller', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteJumpClientInstaller(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteJumpClientInstallerCommand('uuid-123', 1));
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
