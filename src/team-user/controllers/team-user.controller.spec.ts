import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddUserToTeamCommand, RemoveUserFromTeamCommand } from '../commands';
import { UserTeamRoleType } from '../enums';
import { TeamUser } from '../models';
import { RetrieveTeamUsersQuery } from '../queries';
import { TeamUserController } from './team-user.controller';

describe('TeamUserController', () => {
    let controller: TeamUserController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new TeamUserController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveTeamUsers', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as TeamUser[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveTeamUsers(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveTeamUsersQuery('uuid-123', 10, 1, 123));
            expect(result).toBe(expectedResult);
        });
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

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}
