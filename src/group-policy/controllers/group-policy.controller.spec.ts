import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateGroupPolicyCommand, DeleteGroupPolicyCommand, ModifyGroupPolicyCommand } from '../commands';
import { AccessPermissionStatusType } from '../enums';
import { GroupPolicy } from '../models';
import { RetrieveGroupPoliciesQuery, RetrieveGroupPolicyByIdQuery } from '../queries';
import { GroupPolicyController } from './group-policy.controller';

describe('GroupPolicyController', () => {
    let controller: GroupPolicyController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new GroupPolicyController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveGroupPolicy', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicy;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveGroupPolicy('uuid-111', 123, 1);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveGroupPolicyByIdQuery('uuid-111', 123, 1));
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveGroupPolicies', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as GroupPolicy[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveGroupPolicies('uuid-111', 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'group-policy-1',
                namePatterns: ['group-policy'],
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveGroupPoliciesQuery('uuid-111', 123, 10, 1, 'group-policy-1', ['group-policy']),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicy;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createGroupPolicy(undefined, 123, {
                name: 'group-policy-1',
                hasEndpointsAccessPermission: true,
                accessPermissionStatusType: AccessPermissionStatusType.Defined,
                hasShareOtherTeamPermission: true,
                hasInviteExternalUserPermission: true,
                userSessionIdleTimeoutInSeconds: 300,
                hasEnableExtendedAvailabilityModePermission: true,
                hasEditExternalKeyPermission: true,
                hasCollaboratePermission: true,
                hasCollaborateControlPermission: true,
                hasJumpClientPermission: true,
                hasLocalJumpPermission: true,
                hasRemoteJumpPermission: true,
                hasRemoteVncPermission: false,
                hasRemoteRdpPermission: true,
                hasShellJumpPermission: true,
                hasWebJumpPermission: true,
                hasProtocolTunnelPermission: true,
                hasSdStaticPortForExternalToolsPermission: false,
                defaultJumpItemRoleId: 1,
                privateJumpItemRoleId: 2,
                inferiorJumpItemRoleId: 3,
                unassignedJumpItemRoleId: 4,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateGroupPolicyCommand(
                    'uuid-123',
                    123,
                    'group-policy-1',
                    true,
                    AccessPermissionStatusType.Defined,
                    true,
                    true,
                    300,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    false,
                    true,
                    true,
                    true,
                    true,
                    false,
                    1,
                    2,
                    3,
                    4,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicy;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyGroupPolicy('uuid-1234', 123, 1, {
                name: 'group-policy-1',
                hasEndpointsAccessPermission: true,
                accessPermissionStatusType: AccessPermissionStatusType.Defined,
                hasShareOtherTeamPermission: true,
                hasInviteExternalUserPermission: true,
                userSessionIdleTimeoutInSeconds: 300,
                hasEnableExtendedAvailabilityModePermission: true,
                hasEditExternalKeyPermission: true,
                hasCollaboratePermission: true,
                hasCollaborateControlPermission: true,
                hasJumpClientPermission: true,
                hasLocalJumpPermission: true,
                hasRemoteJumpPermission: true,
                hasRemoteVncPermission: false,
                hasRemoteRdpPermission: true,
                hasShellJumpPermission: true,
                hasWebJumpPermission: true,
                hasProtocolTunnelPermission: true,
                hasSdStaticPortForExternalToolsPermission: false,
                defaultJumpItemRoleId: 1,
                privateJumpItemRoleId: 2,
                inferiorJumpItemRoleId: 3,
                unassignedJumpItemRoleId: 4,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyGroupPolicyCommand(
                    'uuid-1234',
                    123,
                    1,
                    'group-policy-1',
                    true,
                    AccessPermissionStatusType.Defined,
                    true,
                    true,
                    300,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    false,
                    true,
                    true,
                    true,
                    true,
                    false,
                    1,
                    2,
                    3,
                    4,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteGroupPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteGroupPolicy(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteGroupPolicyCommand('uuid-123', 123, 1));
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
