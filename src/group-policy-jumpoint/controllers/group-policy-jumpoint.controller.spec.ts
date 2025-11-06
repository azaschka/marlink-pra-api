import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddJumpointToGroupPolicyCommand, RemoveJumpointFromGroupPolicyCommand } from '../commands';
import { GroupPolicyJumpoint } from '../models';
import { RetrieveGroupPolicyJumpointsQuery } from '../queries';
import { GroupPolicyJumpointController } from './group-policy-jumpoint.controller';

describe('GroupPolicyJumpointController', () => {
    let controller: GroupPolicyJumpointController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new GroupPolicyJumpointController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveGroupPolicyJumpoints', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as GroupPolicyJumpoint[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveGroupPolicyJumpoints(undefined, 100, 123, {
                pageSize: 10,
                pageNumber: 1,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveGroupPolicyJumpointsQuery('uuid-123', 100, 10, 1, 123),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('addJumpointToGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicyJumpoint;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addJumpointToGroupPolicy(undefined, 123, 1, {
                jumpointId: 2,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddJumpointToGroupPolicyCommand('uuid-123', 123, 1, 2),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeJumpointFromGroupPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

            await controller.removeJumpointFromGroupPolicy(undefined, 123, 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new RemoveJumpointFromGroupPolicyCommand('uuid-123', 123, 1, 2),
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
