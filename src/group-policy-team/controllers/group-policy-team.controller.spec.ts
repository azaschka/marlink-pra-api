import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddTeamToGroupPolicyCommand, RemoveTeamFromGroupPolicyCommand } from '../commands';
import { GroupPolicyTeamRoleType } from '../enums';
import { GroupPolicyTeam } from '../models';
import { RetrieveGroupPolicyTeamsQuery } from '../queries';
import { GroupPolicyTeamController } from './group-policy-team.controller';

describe('GroupPolicyTeamController', () => {
    let controller: GroupPolicyTeamController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new GroupPolicyTeamController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveGroupPolicyTeams', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as GroupPolicyTeam[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveGroupPolicyTeams(undefined, 100, 123, {
                pageSize: 10,
                pageNumber: 1,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveGroupPolicyTeamsQuery('uuid-123', 100, 10, 1, 123),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('addTeamToGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicyTeam;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addTeamToGroupPolicy(undefined, 123, 1, {
                teamId: 2,
                roleType: GroupPolicyTeamRoleType.Lead,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddTeamToGroupPolicyCommand('uuid-123', 123, 1, 2, GroupPolicyTeamRoleType.Lead),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeTeamFromGroupPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

            await controller.removeTeamFromGroupPolicy(undefined, 123, 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new RemoveTeamFromGroupPolicyCommand('uuid-123', 123, 1, 2),
            );
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
