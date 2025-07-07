import { CommandBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddTeamToGroupPolicyCommand, RemoveTeamFromGroupPolicyCommand } from '../commands';
import { GroupPolicyTeamRoleType } from '../enums';
import { GroupPolicyTeam } from '../models';
import { GroupPolicyTeamsController } from './group-policy-teams.controller';

describe('GroupPolicyTeamsController', () => {
    let controller: GroupPolicyTeamsController;
    let commandBus: CommandBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        controller = new GroupPolicyTeamsController(commandBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('addTeamToGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicyTeam;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addTeamToGroupPolicy(undefined, 1, {
                teamId: 2,
                roleType: GroupPolicyTeamRoleType.Lead,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddTeamToGroupPolicyCommand('uuid-123', 1, 2, GroupPolicyTeamRoleType.Lead),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeTeamFromGroupPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

            await controller.removeTeamFromGroupPolicy(undefined, 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new RemoveTeamFromGroupPolicyCommand('uuid-123', 1, 2));
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}
