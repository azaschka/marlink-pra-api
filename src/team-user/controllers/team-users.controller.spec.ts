import { CommandBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddUserToTeamCommand, RemoveUserFromTeamCommand } from '../commands';
import { UserTeamRoleType } from '../enums';
import { TeamUser } from '../models';
import { TeamUsersController } from './team-users.controller';

describe('TeamUsersController', () => {
    let controller: TeamUsersController;
    let commandBus: CommandBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        controller = new TeamUsersController(commandBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('addUserToTeam', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as TeamUser;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addUserToTeam(undefined, 1, {
                userId: 2,
                roleType: UserTeamRoleType.Member,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddUserToTeamCommand('uuid-123', 1, 2, UserTeamRoleType.Member),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeUserFromTeam', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

            await controller.removeUserFromTeam('uuid-100', 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new RemoveUserFromTeamCommand('uuid-100', 1, 2));
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}
