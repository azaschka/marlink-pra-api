import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { RetrieveCustomersQuery } from '../../customer/queries';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { GroupPolicyMembershipOutcome, UserGroupPolicyMembershipWorkflow } from '../../group-policy-member/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { DeleteUserCommand } from '../../user/commands';
import { UserSourceType } from '../../user/enums';
import { User } from '../../user/models';
import { RetrieveUsersQuery } from '../../user/queries';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../enums';
import { GroupPolicyAssignmentFailedException } from '../exceptions';
import {
    RetrieveSiteAuditorsByUserIdQuery,
    RetrieveSiteByIdQuery,
    RetrieveSiteManagersByUserIdQuery,
    RetrieveSiteSupportTeamMembersByUserIdQuery,
} from '../queries';
import {
    AdminOperatorAccessGroupPolicyWorkflow,
    AdministratorAccessGroupPolicyWorkflow,
    AdministratorGroupPolicyWorkflow,
    BuSamlDefaultGroupPolicyWorkflow,
    BuSupportGroupPolicyWorkflow,
    FullAccessGroupPolicyWorkflow,
    LimitedAccessGroupPolicyWorkflow,
    ManagerAccessGroupPolicyWorkflow,
    ManagerGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
    SupportTeamGroupPolicyWorkflow,
} from './group-policies';
import { SupportTeamJumpGroupWorkflow } from './jump-groups';
import { AuthJumpPolicyWorkflow, NotifyJumpPolicyWorkflow } from './jump-policies';
import { JumpointsWorkflow } from './jumpoints';
import { SiteAuditorWorkflow } from './site-auditor.workflow';
import { SiteManagerWorkflow } from './site-manager.workflow';
import { SiteSupportTeamMemberWorkflow } from './site-support-team-member.workflow';

/**
 * EXT-25: BeyondTrust adds a user of an identity provider to the SAML default policy of its Business Unit at the
 * first sign-in. Site ingestion removes that direct membership once the policies of the role are assigned. The
 * platform never adds it (EXT-24) and role removal does not touch it.
 *
 * Group policy ids used below: ADMINISTRATORS_ACME 10, OPERATORS (site 5) 11, ADMINISTRATOR_ACCESS 12,
 * ADMIN_OPERATOR_ACCESS 13, FULL_ACCESS 14, LIMITED_ACCESS 15, support team policy 16, MANAGERS (site 5) 17,
 * MANAGER_ACCESS 18, GP_MARITIME_SAML_DEFAULT 30, GP_OMNIACCESS_SAML_DEFAULT 31.
 */
describe('BU SAML default group policy of site users (EXT-25)', () => {
    const SITE_ID = 5;
    const BT_INSTANCE_ID = 1;
    const EMAIL = 'p@example.com';
    const EXTERNAL_ACCOUNT = { id: 9, username: 'idp-9', email: EMAIL, securityProviderId: 3 };
    const LOCAL_ACCOUNT = { id: 7, username: EMAIL, email: EMAIL, securityProviderId: 1 };
    const SAML_DEFAULT_IDS = new Map([
        ['GP_MARITIME_SAML_DEFAULT', 30],
        ['GP_OMNIACCESS_SAML_DEFAULT', 31],
    ]);

    const appConfigService = {
        user: { localSecurityProviderIds: [1] },
        site: {
            user: { siteAuditor: { publicDisplayNamePrefix: 'A' }, siteManager: { publicDisplayNamePrefix: 'M' } },
        },
    } as unknown as AppConfigService;

    interface Scenario {
        account: object;
        /** Whether the SAML default policies exist on the BeyondTrust instance. */
        samlDefaultExists?: boolean;
        auditors?: object[];
    }

    let queryBus: QueryBus;
    let commandBus: CommandBus;
    let executedCommands: unknown[];
    let applyMemberships: jest.SpyInstance<
        Promise<GroupPolicyMembershipOutcome>,
        [user: User, groupPolicyIdsToAdd: number[], groupPolicyIdsToRemove: number[]]
    >;

    beforeEach(() => {
        const getOrCreate = (workflow: { prototype: { getOrCreate: unknown } }, id: number) =>
            jest.spyOn(workflow.prototype as { getOrCreate: () => Promise<unknown> }, 'getOrCreate').mockResolvedValue({
                id: id,
            });

        getOrCreate(AdministratorAccessGroupPolicyWorkflow, 12);
        getOrCreate(AdminOperatorAccessGroupPolicyWorkflow, 13);
        getOrCreate(FullAccessGroupPolicyWorkflow, 14);
        getOrCreate(LimitedAccessGroupPolicyWorkflow, 15);
        getOrCreate(SupportTeamGroupPolicyWorkflow, 16);
        getOrCreate(ManagerAccessGroupPolicyWorkflow, 18);
        getOrCreate(SupportTeamJumpGroupWorkflow, 50);

        applyMemberships = jest
            .spyOn(UserGroupPolicyMembershipWorkflow.prototype, 'apply')
            .mockImplementation((_user, toAdd, toRemove) =>
                Promise.resolve({ addedGroupPolicyIds: toAdd, removedGroupPolicyIds: toRemove, failures: [] }),
            );

        executedCommands = [];
        commandBus = {
            execute: jest.fn().mockImplementation((command: unknown) => {
                executedCommands.push(command);

                return Promise.resolve([]);
            }),
        } as unknown as CommandBus;
    });

    afterEach(() => jest.restoreAllMocks());

    function mockScenario(scenario: Scenario): void {
        queryBus = {
            execute: jest.fn().mockImplementation((query: { pageNumber?: number }) => {
                const firstPage = <T>(items: T[] = []) => Promise.resolve(query.pageNumber === 1 ? items : []);

                if (query instanceof RetrieveUsersQuery) return firstPage([scenario.account]);
                if (query instanceof RetrieveGroupPoliciesQuery) {
                    const id = SAML_DEFAULT_IDS.get(query.name ?? '');

                    return Promise.resolve(
                        id !== undefined && (scenario.samlDefaultExists ?? true) ? [{ id: id, name: query.name }] : [],
                    );
                }
                if (query instanceof RetrieveSiteAuditorsByUserIdQuery) return firstPage(scenario.auditors);
                if (
                    query instanceof RetrieveSiteManagersByUserIdQuery ||
                    query instanceof RetrieveSiteSupportTeamMembersByUserIdQuery
                ) {
                    return firstPage([]);
                }
                if (query instanceof RetrieveSiteByIdQuery) return Promise.resolve({ customerKey: 'ACME' });
                if (query instanceof RetrieveCustomersQuery) {
                    return Promise.resolve([
                        { name: 'ACME', beyondtrustInstanceId: BT_INSTANCE_ID, businessUnit: BusinessUnit.MT },
                    ]);
                }

                return Promise.resolve([]);
            }),
        } as unknown as QueryBus;
    }

    function samlDefaultWorkflow(businessUnit: BusinessUnit = BusinessUnit.MT): BuSamlDefaultGroupPolicyWorkflow {
        return new BuSamlDefaultGroupPolicyWorkflow(queryBus, 'tx', businessUnit, BT_INSTANCE_ID);
    }

    function fixedGroupPolicy<T>(id: number): T {
        return { getOrCreate: () => Promise.resolve({ id: id }) } as unknown as T;
    }

    function createManagerWorkflow(
        sourceType: UserSourceType,
        buSamlDefault: BuSamlDefaultGroupPolicyWorkflow = samlDefaultWorkflow(),
    ): SiteManagerWorkflow {
        const jumpPolicy = { id: 60, notificationEmailAddresses: [EMAIL], approvalUserIds: ['7', '9'] };

        return new SiteManagerWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            'tx',
            'SITE',
            { id: 1, siteId: SITE_ID, username: EMAIL, email: EMAIL, sourceType: sourceType },
            BT_INSTANCE_ID,
            fixedGroupPolicy<ManagerGroupPolicyWorkflow>(17),
            { getOrCreate: () => Promise.resolve(jumpPolicy) } as unknown as AuthJumpPolicyWorkflow,
            { getOrCreate: () => Promise.resolve(jumpPolicy) } as unknown as NotifyJumpPolicyWorkflow,
            buSamlDefault,
        );
    }

    function createAuditorWorkflow(
        sourceType: UserSourceType,
        isAdminOperator = false,
        buSamlDefault: BuSamlDefaultGroupPolicyWorkflow = samlDefaultWorkflow(),
    ): SiteAuditorWorkflow {
        return new SiteAuditorWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            'tx',
            {
                id: 2,
                siteId: SITE_ID,
                username: EMAIL,
                email: EMAIL,
                isAdminOperator: isAdminOperator,
                sourceType: sourceType,
            },
            'ACME',
            BT_INSTANCE_ID,
            fixedGroupPolicy<AdministratorGroupPolicyWorkflow>(10),
            fixedGroupPolicy<OperatorGroupPolicyWorkflow>(11),
            buSamlDefault,
        );
    }

    function createSupportTeamMemberWorkflow(sourceType: UserSourceType): SiteSupportTeamMemberWorkflow {
        return new SiteSupportTeamMemberWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            'tx',
            {
                id: 3,
                siteId: SITE_ID,
                firstname: 'P',
                lastname: 'Erson',
                email: EMAIL,
                supportTeamName: 'TEAM_A',
                supportTeamAccessLevel: SiteSupportTeamAccessLevel.Limited,
                supportTeamTrustLevel: SiteSupportTeamTrustLevel.RequireAuth,
                sourceType: sourceType,
            },
            'ACME',
            BT_INSTANCE_ID,
            fixedGroupPolicy<AdministratorGroupPolicyWorkflow>(10),
            fixedGroupPolicy<OperatorGroupPolicyWorkflow>(11),
            { getOrCreate: () => Promise.resolve([]) } as unknown as JumpointsWorkflow,
            { get: () => Promise.resolve(null) } as unknown as BuSupportGroupPolicyWorkflow,
            samlDefaultWorkflow(),
        );
    }

    /** Group policy ids of every membership call, in call order: [toAdd, toRemove]. */
    function membershipCalls(): [number[], number[]][] {
        return applyMemberships.mock.calls.map(([, toAdd, toRemove]) => [toAdd, toRemove]);
    }

    function samlDefaultLookups(): (string | undefined)[] {
        const calls = (queryBus.execute as jest.Mock).mock.calls as unknown[][];

        return calls
            .map(([query]) => query)
            .filter((query): query is RetrieveGroupPoliciesQuery => query instanceof RetrieveGroupPoliciesQuery)
            .map((query) => query.name);
    }

    describe('ingestion', () => {
        it('should remove an external site manager from the SAML default policy after its role policies', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            const siteManager = await createManagerWorkflow(UserSourceType.External).getOrCreate();

            expect(siteManager.userId).toBe(EXTERNAL_ACCOUNT.id);
            expect(membershipCalls()).toEqual([
                [[17, 18], []],
                [[], [30]],
            ]);
        });

        it('should remove an external site auditor after its role policies', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createAuditorWorkflow(UserSourceType.External).getOrCreate();

            expect(membershipCalls()).toEqual([
                [[10, 12], []],
                [[], [30]],
            ]);
        });

        it('should remove an external auditor operator after its role policies', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createAuditorWorkflow(UserSourceType.External, true).getOrCreate();

            expect(membershipCalls()).toEqual([
                [[10, 13, 11, 14], []],
                [[], [30]],
            ]);
        });

        it('should remove an external site support team member after its role policies', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createSupportTeamMemberWorkflow(UserSourceType.External).getOrCreate();

            expect(membershipCalls()).toEqual([
                [[16, 11, 15], []],
                [[], [30]],
            ]);
        });

        it("should remove only the policy of the customer's Business Unit", async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createAuditorWorkflow(
                UserSourceType.External,
                false,
                samlDefaultWorkflow(BusinessUnit.OA),
            ).getOrCreate();

            expect(samlDefaultLookups()).toEqual(['GP_OMNIACCESS_SAML_DEFAULT']);
            expect(membershipCalls()).toEqual([
                [[10, 12], []],
                [[], [31]],
            ]);
        });

        it('should look the policy up once per ingestion run for all roles', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });
            const sharedLookup = samlDefaultWorkflow();

            await createManagerWorkflow(UserSourceType.External, sharedLookup).getOrCreate();
            await createAuditorWorkflow(UserSourceType.External, false, sharedLookup).getOrCreate();

            expect(samlDefaultLookups()).toEqual(['GP_MARITIME_SAML_DEFAULT']);
        });

        it('should neither look up nor remove the policy for local users', async () => {
            mockScenario({ account: LOCAL_ACCOUNT });

            await createManagerWorkflow(UserSourceType.Internal).getOrCreate();
            await createAuditorWorkflow(UserSourceType.Internal).getOrCreate();
            await createSupportTeamMemberWorkflow(UserSourceType.Internal).getOrCreate();

            const localChanges = executedCommands.filter(
                (command): command is ModifyUserGroupPoliciesCommand =>
                    command instanceof ModifyUserGroupPoliciesCommand,
            );
            expect(
                localChanges.map((command) => [command.groupPolicyIdsToAdd, command.groupPolicyIdsToRemove]),
            ).toEqual([
                [[17, 18], []],
                [[10, 12], []],
                [[16, 11, 15], []],
            ]);
            expect(applyMemberships).not.toHaveBeenCalled();
            expect(samlDefaultLookups()).toEqual([]);
        });

        it('should assign the role policies and remove nothing when the policy does not exist', async () => {
            jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            mockScenario({ account: EXTERNAL_ACCOUNT, samlDefaultExists: false });

            const siteAuditor = await createAuditorWorkflow(UserSourceType.External).getOrCreate();

            expect(siteAuditor.userId).toBe(EXTERNAL_ACCOUNT.id);
            expect(membershipCalls()).toEqual([[[10, 12], []]]);
        });

        it('should keep the SAML default policy when a role policy could not be assigned', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => undefined);
            mockScenario({ account: EXTERNAL_ACCOUNT });
            applyMemberships.mockResolvedValueOnce({
                addedGroupPolicyIds: [10],
                removedGroupPolicyIds: [],
                failures: [{ groupPolicyId: 12, operation: 'add', message: 'timeout' }],
            });

            await expect(createAuditorWorkflow(UserSourceType.External).getOrCreate()).rejects.toBeInstanceOf(
                GroupPolicyAssignmentFailedException,
            );
            expect(membershipCalls()).toEqual([[[10, 12], []]]);
        });

        it('should report the user when leaving the SAML default policy fails, after the role is in place', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });
            applyMemberships
                .mockResolvedValueOnce({ addedGroupPolicyIds: [17, 18], removedGroupPolicyIds: [], failures: [] })
                .mockResolvedValueOnce({
                    addedGroupPolicyIds: [],
                    removedGroupPolicyIds: [],
                    failures: [{ groupPolicyId: 30, operation: 'remove', message: 'timeout' }],
                });

            const error = await createManagerWorkflow(UserSourceType.External)
                .getOrCreate()
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(GroupPolicyAssignmentFailedException);
            expect((error as GroupPolicyAssignmentFailedException).failures).toEqual([
                { groupPolicyId: 30, operation: 'remove', message: 'timeout' },
            ]);
            expect(membershipCalls()).toEqual([
                [[17, 18], []],
                [[], [30]],
            ]);
        });
    });

    describe('removal of a role', () => {
        it('should not touch the SAML default policy when the last role of an external user is removed', async () => {
            mockScenario({
                account: EXTERNAL_ACCOUNT,
                auditors: [{ id: 2, siteId: SITE_ID, userId: 9, sourceType: UserSourceType.External }],
            });

            await createAuditorWorkflow(UserSourceType.External).delete();

            expect(membershipCalls()).toEqual([[[], [10, 12]]]);
            expect(samlDefaultLookups()).toEqual([]);
            expect(executedCommands).toContainEqual(new DeleteUserCommand('tx', BT_INSTANCE_ID, 9));
        });
    });
});
