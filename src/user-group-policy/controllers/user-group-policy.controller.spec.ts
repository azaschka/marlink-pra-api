import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { AddMemberToGroupPolicyCommand, RemoveMemberFromGroupPolicyCommand } from '../../group-policy-member/commands';
import { RetrieveGroupPolicyMembersQuery } from '../../group-policy-member/queries';
import { UuidUtility } from '../../shared/utilities';
import { User } from '../../user/models';
import { RetrieveUserByIdQuery } from '../../user/queries';
import { NonLocalGroupPolicyChangeFailedException } from '../exceptions';
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
        const appConfigService = { user: { localSecurityProviderIds: [1] } } as unknown as AppConfigService;
        controller = new UserGroupPolicyController(commandBus, queryBus, appConfigService);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveUserGroupPolicies', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as UserGroupPolicy[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveUserGroupPolicies(undefined, 100, 123, {
                pageSize: 10,
                pageNumber: 1,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveUserGroupPoliciesQuery('uuid-123', 100, 10, 1, 123),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyUserGroupPolicies', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as UserGroupPolicy[];
            jest.spyOn(queryBus, 'execute').mockResolvedValue({ id: 1, securityProviderId: 1 } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyUserGroupPolicies(undefined, 123, 1, {
                groupPolicyIdsToAdd: [1, 2],
                groupPolicyIdsToRemove: [3],
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyUserGroupPoliciesCommand('uuid-123', 123, 1, [1, 2], [3]),
            );
            expect(result).toBe(expectedResult);
        });

        describe('for a non-local user (EXT-04)', () => {
            const externalUser = { id: 7, securityProviderId: 3 } as User;

            function mockMembers(membersByGroupPolicy: Map<number, { memberId: number; userId: number }[]>) {
                jest.spyOn(queryBus, 'execute').mockImplementation((query: unknown) => {
                    if (query instanceof RetrieveUserByIdQuery) {
                        return Promise.resolve(externalUser);
                    }
                    if (query instanceof RetrieveGroupPolicyMembersQuery) {
                        return Promise.resolve(
                            query.pageNumber === 1 ? (membersByGroupPolicy.get(query.groupPolicyId) ?? []) : [],
                        );
                    }
                    return Promise.resolve([]);
                });
            }

            it('should use the member endpoints instead of the local-only group policy change', async () => {
                mockMembers(new Map([[3, [{ memberId: 30, userId: 7 }]]]));
                const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

                const result = await controller.modifyUserGroupPolicies(undefined, 123, 7, {
                    groupPolicyIdsToAdd: [1],
                    groupPolicyIdsToRemove: [3],
                });

                const commands = commandBusExecuteSpy.mock.calls.map((call) => call[0] as unknown);
                expect(commands.some((command) => command instanceof ModifyUserGroupPoliciesCommand)).toBe(false);
                expect(commands).toContainEqual(new AddMemberToGroupPolicyCommand('uuid-123', 123, 1, 7, 3));
                expect(commands).toContainEqual(new RemoveMemberFromGroupPolicyCommand('uuid-123', 123, 3, 30));
                expect(result.map((entry) => entry.groupPolicyId)).toEqual([1]);
            });

            it('should report the changes that failed after attempting all of them', async () => {
                mockMembers(new Map());
                jest.spyOn(commandBus, 'execute').mockImplementation((command: unknown) =>
                    command instanceof AddMemberToGroupPolicyCommand && command.id === 2
                        ? Promise.reject(new Error('BeyondTrust rejected the member'))
                        : Promise.resolve(undefined),
                );

                await expect(
                    controller.modifyUserGroupPolicies(undefined, 123, 7, {
                        groupPolicyIdsToAdd: [1, 2],
                        groupPolicyIdsToRemove: [],
                    }),
                ).rejects.toThrow(NonLocalGroupPolicyChangeFailedException);
            });
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
