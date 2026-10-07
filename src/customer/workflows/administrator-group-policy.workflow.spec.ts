import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { DeleteGroupPolicyCommand } from '../../group-policy/commands';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { RetrieveGroupPolicyMembersQuery } from '../../group-policy-member/queries/retrieve-group-policy-members.query';
import {
    RetrieveSiteAuditorsByUserIdQuery,
    RetrieveSiteByIdQuery,
    RetrieveSiteManagersByUserIdQuery,
    RetrieveSiteSupportTeamMembersByUserIdQuery,
} from '../../site/queries';
import { DeleteUserCommand } from '../../user/commands';
import { RetrieveCustomersQuery } from '../queries';
import { AdministratorGroupPolicyWorkflow } from './administrator-group-policy.workflow';

/**
 * EXT-19: customer deletion removes the customer's administrators group policy and deletes the accounts that were
 * direct members of it, local and non-local alike, unless an account still holds a site role.
 */
describe('AdministratorGroupPolicyWorkflow.delete', () => {
    const TRANSACTION_ID = 'tx';
    const BT_INSTANCE_ID = 1;
    const GROUP_POLICY = { id: 10, name: 'ADMINISTRATORS_ACME' };
    const appConfigService = {
        customer: { groupPolicy: { administratorPrefix: 'ADMINISTRATORS_' } },
    } as unknown as AppConfigService;

    interface SiteRoleRow {
        id: number;
        siteId: number;
        userId: number;
    }

    interface SiteRows {
        managers?: SiteRoleRow[];
        auditors?: SiteRoleRow[];
        members?: SiteRoleRow[];
    }

    let queryBus: QueryBus;
    let commandBus: CommandBus;
    let executedCommands: unknown[];

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        executedCommands = [];
        commandBus = {
            execute: jest.fn().mockImplementation((command: unknown) => {
                executedCommands.push(command);

                return Promise.resolve();
            }),
        } as unknown as CommandBus;
    });

    afterEach(() => jest.restoreAllMocks());

    /**
     * @param groupPolicyMembers members of the administrators group policy, split into pages by the caller
     * @param siteRows site role rows of all users
     * @param siteInstanceIds BeyondTrust instance per site id; sites not listed belong to BT_INSTANCE_ID
     */
    function mockQueries(
        groupPolicyMembers: object[][],
        siteRows: SiteRows = {},
        siteInstanceIds: Map<number, number> = new Map<number, number>(),
        groupPolicies: object[] = [GROUP_POLICY],
    ): void {
        queryBus = {
            execute: jest.fn().mockImplementation((query: { pageNumber?: number }) => {
                const rowsOfUser = (rows: SiteRoleRow[] = [], userId: number) =>
                    Promise.resolve(query.pageNumber === 1 ? rows.filter((row) => row.userId === userId) : []);

                if (query instanceof RetrieveGroupPoliciesQuery) return Promise.resolve(groupPolicies);
                if (query instanceof RetrieveGroupPolicyMembersQuery) {
                    return Promise.resolve(groupPolicyMembers[query.pageNumber - 1] ?? []);
                }
                if (query instanceof RetrieveSiteManagersByUserIdQuery) {
                    return rowsOfUser(siteRows.managers, query.userId);
                }
                if (query instanceof RetrieveSiteAuditorsByUserIdQuery) {
                    return rowsOfUser(siteRows.auditors, query.userId);
                }
                if (query instanceof RetrieveSiteSupportTeamMembersByUserIdQuery) {
                    return rowsOfUser(siteRows.members, query.userId);
                }
                if (query instanceof RetrieveSiteByIdQuery) {
                    return Promise.resolve({ customerKey: `customer-of-site-${query.siteId}` });
                }
                if (query instanceof RetrieveCustomersQuery) {
                    const siteId = Number(query.key?.replace('customer-of-site-', ''));

                    return Promise.resolve([
                        { name: 'OTHER', beyondtrustInstanceId: siteInstanceIds.get(siteId) ?? BT_INSTANCE_ID },
                    ]);
                }

                return Promise.resolve([]);
            }),
        } as unknown as QueryBus;
    }

    function createWorkflow(): AdministratorGroupPolicyWorkflow {
        return new AdministratorGroupPolicyWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            TRANSACTION_ID,
            'acme',
            BT_INSTANCE_ID,
        );
    }

    function deletedUserIds(): number[] {
        return executedCommands
            .filter((command): command is DeleteUserCommand => command instanceof DeleteUserCommand)
            .map((command) => command.id);
    }

    function hasDeletedGroupPolicy(): boolean {
        return executedCommands.some(
            (command) => command instanceof DeleteGroupPolicyCommand && command.id === GROUP_POLICY.id,
        );
    }

    it('should delete a member without any site role, whether local or provisioned by an identity provider', async () => {
        mockQueries([
            [
                { memberId: 1, userId: 7, securityProviderId: 1 },
                { memberId: 2, userId: 9, securityProviderId: 3 },
            ],
        ]);

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([7, 9]);
        expect(executedCommands).toContainEqual(new DeleteUserCommand(TRANSACTION_ID, BT_INSTANCE_ID, 9));
        expect(hasDeletedGroupPolicy()).toBe(true);
    });

    it('should keep a member that is still a site auditor', async () => {
        mockQueries([[{ memberId: 1, userId: 7 }]], { auditors: [{ id: 2, siteId: 5, userId: 7 }] });

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([]);
        expect(hasDeletedGroupPolicy()).toBe(true);
    });

    it('should keep a member that is still a site manager', async () => {
        mockQueries([[{ memberId: 1, userId: 7 }]], { managers: [{ id: 1, siteId: 5, userId: 7 }] });

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([]);
    });

    it('should keep a member that is still a site support team member', async () => {
        mockQueries([[{ memberId: 1, userId: 7 }]], { members: [{ id: 3, siteId: 5, userId: 7 }] });

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([]);
    });

    it('should decide per member', async () => {
        mockQueries(
            [
                [
                    { memberId: 1, userId: 7 },
                    { memberId: 2, userId: 8 },
                ],
            ],
            { managers: [{ id: 1, siteId: 5, userId: 7 }] },
        );

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([8]);
    });

    it('should not count a role with the same user id on another BeyondTrust instance', async () => {
        mockQueries([[{ memberId: 1, userId: 7 }]], { managers: [{ id: 1, siteId: 6, userId: 7 }] }, new Map([[6, 2]]));

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([7]);
    });

    it('should leave identity provider groups alone', async () => {
        mockQueries([[{ memberId: 1, groupName: 'PRA-Maritime-Admins', securityProviderId: 3 }]]);

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([]);
        expect(hasDeletedGroupPolicy()).toBe(true);
    });

    it('should process members beyond the first page', async () => {
        const firstPage = Array.from({ length: 100 }, (_, index) => ({ memberId: index + 1, userId: index + 1 }));

        mockQueries([firstPage, [{ memberId: 101, userId: 101 }]]);

        await createWorkflow().delete();

        expect(deletedUserIds()).toHaveLength(101);
        expect(deletedUserIds()).toContain(101);
    });

    it('should continue with the next member and the group policy when one deletion fails', async () => {
        mockQueries([
            [
                { memberId: 1, userId: 7 },
                { memberId: 2, userId: 8 },
            ],
        ]);
        (commandBus.execute as jest.Mock).mockImplementation((command: unknown) => {
            executedCommands.push(command);

            return command instanceof DeleteUserCommand && command.id === 7
                ? Promise.reject(new Error('BeyondTrust refused to delete the user'))
                : Promise.resolve();
        });

        await createWorkflow().delete();

        expect(deletedUserIds()).toEqual([7, 8]);
        expect(hasDeletedGroupPolicy()).toBe(true);
    });

    it('should do nothing when the administrators group policy does not exist', async () => {
        mockQueries([[{ memberId: 1, userId: 7 }]], {}, new Map<number, number>(), []);

        await createWorkflow().delete();

        expect(executedCommands).toEqual([]);
    });
});
