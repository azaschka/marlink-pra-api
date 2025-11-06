import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddJumpGroupToGroupPolicyCommand, RemoveJumpGroupFromGroupPolicyCommand } from '../commands';
import { GroupPolicyJumpGroup } from '../models';
import { RetrieveGroupPolicyJumpGroupsQuery } from '../queries';
import { GroupPolicyJumpGroupController } from './group-policy-jump-group.controller';

describe('GroupPolicyJumpGroupController', () => {
    let controller: GroupPolicyJumpGroupController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new GroupPolicyJumpGroupController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveGroupPolicyJumpGroups', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as GroupPolicyJumpGroup[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveGroupPolicyJumpGroups(undefined, 100, 123, {
                pageSize: 10,
                pageNumber: 1,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveGroupPolicyJumpGroupsQuery('uuid-123', 100, 10, 1, 123),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('addJumpGroupToGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicyJumpGroup;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addJumpGroupToGroupPolicy(undefined, 100, 1, {
                jumpGroupId: 2,
                jumpItemRoleId: 3,
                jumpPolicyId: 4,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddJumpGroupToGroupPolicyCommand('uuid-123', 100, 1, 2, 3, 4),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeJumpGroupFromGroupPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

            await controller.removeJumpGroupFromGroupPolicy(undefined, 100, 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new RemoveJumpGroupFromGroupPolicyCommand('uuid-123', 100, 1, 2),
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
