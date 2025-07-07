import { CommandBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddMemberToGroupPolicyCommand, RemoveMemberFromGroupPolicyCommand } from '../commands';
import { GroupPolicyMember } from '../models';
import { GroupPolicyMembersController } from './group-policy-members.controller';

describe('GroupPolicyMembersController', () => {
    let controller: GroupPolicyMembersController;
    let commandBus: CommandBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        controller = new GroupPolicyMembersController(commandBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('addMemberToGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicyMember;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addMemberToGroupPolicy(undefined, 1, {
                userId: 2,
                securityProviderId: 3,
                distinguishedName: 'distinguished-name',
                groupName: 'group-name',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddMemberToGroupPolicyCommand('uuid-123', 1, 2, 3, 'distinguished-name', 'group-name'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeMemberFromGroupPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

            await controller.removeMemberFromGroupPolicy(undefined, 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new RemoveMemberFromGroupPolicyCommand('uuid-123', 1, 2));
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}
