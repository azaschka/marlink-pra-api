import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateTeamCommand, DeleteTeamCommand, ModifyTeamCommand } from '../commands';
import { Team } from '../models';
import { RetrieveTeamByIdQuery, RetrieveTeamsQuery } from '../queries';
import { TeamController } from './team.controller';

describe('TeamController', () => {
    let controller: TeamController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new TeamController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveTeam', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Team;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveTeam(undefined, 123, 1);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveTeamByIdQuery('uuid-123', 123, 1));
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveTeams', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Team[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveTeams(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'team-1',
                codeName: 'team-code-1',
                namePatterns: ['team%'],
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveTeamsQuery('uuid-123', 123, 10, 1, 'team-1', 'team-code-1', ['team%']),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createTeam', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Team;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createTeam(undefined, 123, {
                name: 'team-1',
                codeName: 'team-code-1',
                comments: 'team comments 1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateTeamCommand('uuid-123', 123, 'team-1', 'team-code-1', 'team comments 1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyTeam', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Team;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyTeam(undefined, 123, 1, {
                name: 'team-1',
                codeName: 'team-code-1',
                comments: 'team comments 1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyTeamCommand('uuid-123', 123, 1, 'team-1', 'team-code-1', 'team comments 1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteTeam', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteTeam(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteTeamCommand('uuid-123', 123, 1));
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
