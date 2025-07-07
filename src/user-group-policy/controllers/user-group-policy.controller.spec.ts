import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { ModifyUserGroupPoliciesCommand } from '../commands';
import { UserGroupPolicy } from '../models';
import { RetrieveUserGroupPoliciesQuery } from '../queries';
import { UserGroupPolicyController } from './user-group-policy.controller';

describe('UserGroupPolicyController', () => {
    let controller: UserGroupPolicyController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new UserGroupPolicyController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveUserGroupPolicies', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as UserGroupPolicy[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveUserGroupPolicies(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveUserGroupPoliciesQuery('uuid-123', 10, 1, 123));
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyUserGroupPolicies', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as UserGroupPolicy[];
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyUserGroupPolicies(undefined, 1, {
                groupPolicyIdsToAdd: [1, 2],
                groupPolicyIdsToRemove: [3],
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyUserGroupPoliciesCommand('uuid-123', 1, [1, 2], [3]),
            );
            expect(result).toBe(expectedResult);
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
