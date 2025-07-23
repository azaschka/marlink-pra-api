import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateJumpointCommand, DeleteJumpointCommand, ModifyJumpointCommand } from '../commands';
import { JumpointPlatformType, JzpClientAddressRestrictionsType } from '../enums';
import { Jumpoint } from '../models';
import { RetrieveJumpointsQuery } from '../queries';
import { JumpointController } from './jumpoint.controller';

describe('JumpointController', () => {
    let controller: JumpointController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new JumpointController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpoints', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Jumpoint[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpoints(undefined, {
                pageSize: 10,
                pageNumber: 1,
                name: 'jumpoint-1',
                codeName: 'code-1',
                namePattern: 'jumpoint%',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveJumpointsQuery(
                    'uuid-123',
                    10,
                    1,
                    'jumpoint-1',
                    undefined,
                    undefined,
                    undefined,
                    'code-1',
                    'jumpoint%',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createJumpoint', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Jumpoint;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createJumpoint(undefined, {
                name: 'Jumpoint 1',
                platformType: JumpointPlatformType.LinuxX86,
                codeName: 'J1',
                comments: 'Test Jumpoint 1',
                isEnabled: true,
                isClustered: false,
                isShellJumpEnabled: true,
                externalJumpItemNetworkId: 'ext-1',
                isProtocolTunnelEnabled: true,
                rdpServiceAccountId: 1,
                managedIpRanges: [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                isJzpEnabled: true,
                jzpProxyHostname: 'proxy.example.com',
                jzpProxyPort: 8080,
                isJzpHttpGetAllowed: true,
                jzpClientAddressRestrictionsType: JzpClientAddressRestrictionsType.AllowAll,
                jzpRestrictedIps: ['192.168.1.100'],
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateJumpointCommand(
                    'uuid-123',
                    'Jumpoint 1',
                    JumpointPlatformType.LinuxX86,
                    'J1',
                    'Test Jumpoint 1',
                    true,
                    false,
                    true,
                    'ext-1',
                    true,
                    1,
                    [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                    true,
                    'proxy.example.com',
                    8080,
                    true,
                    JzpClientAddressRestrictionsType.AllowAll,
                    ['192.168.1.100'],
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyJumpoint', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Jumpoint;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyJumpoint(undefined, 1, {
                name: 'Jumpoint 1',
                codeName: 'J1',
                comments: 'Test Jumpoint 1',
                isEnabled: true,
                isShellJumpEnabled: true,
                externalJumpItemNetworkId: 'ext-1',
                isProtocolTunnelEnabled: true,
                rdpServiceAccountId: 1,
                managedIpRanges: [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                isJzpEnabled: true,
                jzpProxyHostname: 'proxy.example.com',
                jzpProxyPort: 8080,
                isJzpHttpGetAllowed: true,
                jzpClientAddressRestrictionsType: JzpClientAddressRestrictionsType.AllowAll,
                jzpRestrictedIps: ['192.168.1.100'],
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyJumpointCommand(
                    'uuid-123',
                    1,
                    'Jumpoint 1',
                    'J1',
                    'Test Jumpoint 1',
                    true,
                    true,
                    'ext-1',
                    true,
                    1,
                    [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                    true,
                    'proxy.example.com',
                    8080,
                    true,
                    JzpClientAddressRestrictionsType.AllowAll,
                    ['192.168.1.100'],
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteJumpoint', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteJumpoint(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteJumpointCommand('uuid-123', 1));
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
