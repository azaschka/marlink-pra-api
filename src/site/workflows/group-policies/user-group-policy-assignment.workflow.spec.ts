import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    AddMemberToGroupPolicyCommand,
    RemoveMemberFromGroupPolicyCommand,
} from '../../../group-policy-member/commands';
import { GroupPolicyMember } from '../../../group-policy-member/models';
import { ModifyUserGroupPoliciesCommand } from '../../../user-group-policy/commands';
import { UserSourceType } from '../../../user/enums';
import { User } from '../../../user/models';
import { SiteUserType } from '../../enums';
import { GroupPolicyAssignmentFailedException } from '../../exceptions';
import { UserGroupPolicyAssignmentWorkflow } from './user-group-policy-assignment.workflow';

/**
 * R3.2-A003, 3.1(1): group policy membership of a non-local user cannot go through
 * PATCH /user/{id}/group-policy-changes and has to use the group policy member endpoints instead.
 */
describe('UserGroupPolicyAssignmentWorkflow', () => {
    const TRANSACTION_ID = 'transaction-id';
    const BT_INSTANCE_ID = 42;
    const EMAIL = 'user@example.com';
    const SECURITY_PROVIDER_ID = 3;

    let queryBus: QueryBus;
    let commandBus: CommandBus;
    let workflow: UserGroupPolicyAssignmentWorkflow;

    beforeEach(() => {
        queryBus = { execute: jest.fn() } as unknown as QueryBus;
        commandBus = { execute: jest.fn() } as unknown as CommandBus;
        workflow = new UserGroupPolicyAssignmentWorkflow(queryBus, commandBus, TRANSACTION_ID, BT_INSTANCE_ID);
    });

    describe('local user', () => {
        it('should apply every change in a single call and never touch the member endpoints', async () => {
            await modify(UserSourceType.Internal, createUser({ securityProviderId: undefined }), [1, 2], [3]);

            const command = commandOfType(ModifyUserGroupPoliciesCommand);
            expect(command?.groupPolicyIdsToAdd).toEqual([1, 2]);
            expect(command?.groupPolicyIdsToRemove).toEqual([3]);
            expectNoCommandOfType(AddMemberToGroupPolicyCommand);
            expectNoCommandOfType(RemoveMemberFromGroupPolicyCommand);
        });
    });

    describe('non-local user', () => {
        it('should add a membership per group policy and never use the local-only endpoint', async () => {
            mockGroupPolicyMembers([]);

            await modify(UserSourceType.External, createUser({}), [1, 2], []);

            expectNoCommandOfType(ModifyUserGroupPoliciesCommand);

            const addCommands = commandsOfType(AddMemberToGroupPolicyCommand);
            expect(addCommands.map((command) => command.id)).toEqual([1, 2]);
            expect(addCommands.every((command) => command.securityProviderId === SECURITY_PROVIDER_ID)).toBe(true);
        });

        it('should not add a membership that already exists', async () => {
            mockGroupPolicyMembers([createMember({ groupPolicyId: 1, userId: 7, memberId: 100 })]);

            await modify(UserSourceType.External, createUser({ id: 7 }), [1], []);

            expectNoCommandOfType(AddMemberToGroupPolicyCommand);
        });

        it('should remove a membership by its member id', async () => {
            mockGroupPolicyMembers([createMember({ groupPolicyId: 5, userId: 7, memberId: 100 })]);

            await modify(UserSourceType.External, createUser({ id: 7 }), [], [5]);

            const command = commandOfType(RemoveMemberFromGroupPolicyCommand);
            expect(command?.id).toBe(5);
            expect(command?.memberId).toBe(100);
        });

        it('should accept a membership that is already gone', async () => {
            mockGroupPolicyMembers([]);

            await expect(modify(UserSourceType.External, createUser({ id: 7 }), [], [5])).resolves.toBeUndefined();
            expectNoCommandOfType(RemoveMemberFromGroupPolicyCommand);
        });

        it('should keep going after a failing group policy and report all failures at the end', async () => {
            mockGroupPolicyMembers([]);
            (commandBus.execute as jest.Mock).mockImplementation((command: unknown) => {
                if (command instanceof AddMemberToGroupPolicyCommand && command.id === 1) {
                    return Promise.reject(new Error('group policy unavailable'));
                }

                return Promise.resolve();
            });

            await expect(modify(UserSourceType.External, createUser({}), [1, 2], [])).rejects.toThrow(
                GroupPolicyAssignmentFailedException,
            );

            const addCommands = commandsOfType(AddMemberToGroupPolicyCommand);
            expect(addCommands.map((command) => command.id)).toEqual([1, 2]);
        });

        it('should fail the user rather than send an incomplete request when the security provider is missing', async () => {
            mockGroupPolicyMembers([]);

            await expect(
                modify(UserSourceType.External, createUser({ securityProviderId: undefined }), [1], []),
            ).rejects.toThrow(GroupPolicyAssignmentFailedException);
            expectNoCommandOfType(AddMemberToGroupPolicyCommand);
        });
    });

    it('should do nothing when there is nothing to change', async () => {
        await modify(UserSourceType.External, createUser({}), [], []);

        expect((commandBus.execute as jest.Mock).mock.calls).toHaveLength(0);
    });

    function modify(sourceType: UserSourceType, user: User, add: number[], remove: number[]): Promise<void> {
        return workflow.modify(SiteUserType.SiteManager, sourceType, EMAIL, user, add, remove);
    }

    /** findMember pages through the members of one group policy until a page comes back empty. */
    function mockGroupPolicyMembers(members: GroupPolicyMember[]): void {
        (queryBus.execute as jest.Mock).mockImplementation((query: { pageNumber: number; groupPolicyId: number }) =>
            Promise.resolve(
                query.pageNumber === 1 ? members.filter((member) => member.groupPolicyId === query.groupPolicyId) : [],
            ),
        );
    }

    function createUser(overrides: Partial<User>): User {
        return {
            id: 7,
            publicDisplayName: 'display-name',
            securityProviderId: SECURITY_PROVIDER_ID,
            lastSyncDate: new Date(),
            ...overrides,
        } as User;
    }

    function createMember(overrides: Partial<GroupPolicyMember>): GroupPolicyMember {
        return {
            groupPolicyId: 1,
            memberId: 100,
            userId: 7,
            securityProviderId: SECURITY_PROVIDER_ID,
            lastSyncDate: new Date(),
            ...overrides,
        } as GroupPolicyMember;
    }

    function commandsOfType<T>(commandType: new (...args: never[]) => T): T[] {
        const calls = (commandBus.execute as jest.Mock).mock.calls as unknown[][];

        return calls.map((call) => call[0]).filter((command): command is T => command instanceof commandType);
    }

    function commandOfType<T>(commandType: new (...args: never[]) => T): T | undefined {
        return commandsOfType(commandType)[0];
    }

    function expectNoCommandOfType<T>(commandType: new (...args: never[]) => T): void {
        expect(commandsOfType(commandType)).toHaveLength(0);
    }
});
