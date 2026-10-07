import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { RetrieveCustomersQuery } from '../../customer/queries';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { UserGroupPolicyMembershipWorkflow } from '../../group-policy-member/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { DeleteUserCommand } from '../../user/commands';
import { UserSourceType } from '../../user/enums';
import { RetrieveUsersQuery } from '../../user/queries';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../enums';
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
 * EXT-21: external site users are members of the SAML default group policy of the customer's Business Unit.
 *
 * Group policy ids used below: ADMINISTRATORS_ACME 10, OPERATORS (site 5) 11, ADMINISTRATOR_ACCESS 12,
 * ADMIN_OPERATOR_ACCESS 13, FULL_ACCESS 14, LIMITED_ACCESS 15, support team policy 16, MANAGERS (site 5) 17,
 * MANAGER_ACCESS 18, GP_MARITIME_SAML_DEFAULT 30.
 */
describe('BU SAML default group policy of site users (EXT-21)', () => {
    const SITE_ID = 5;
    const BT_INSTANCE_ID = 1;
    const EMAIL = 'p@example.com';
    const EXTERNAL_ACCOUNT = { id: 9, username: 'idp-9', email: EMAIL, securityProviderId: 3 };
    const LOCAL_ACCOUNT = { id: 7, username: EMAIL, email: EMAIL, securityProviderId: 1 };
    const SAML_DEFAULT_ID = 30;

    const appConfigService = {
        user: { localSecurityProviderIds: [1] },
        site: {
            user: { siteAuditor: { publicDisplayNamePrefix: 'A' }, siteManager: { publicDisplayNamePrefix: 'M' } },
        },
    } as unknown as AppConfigService;

    interface Scenario {
        account: object;
        /** Whether GP_MARITIME_SAML_DEFAULT exists on the BeyondTrust instance. */
        samlDefaultExists?: boolean;
        managers?: object[];
        auditors?: object[];
        members?: object[];
        /** Business Unit of the customer per site id; sites not listed belong to a Maritime customer. */
        businessUnitOfSite?: Map<number, BusinessUnit>;
    }

    let queryBus: QueryBus;
    let commandBus: CommandBus;
    let executedCommands: unknown[];
    let applyMemberships: jest.SpyInstance;

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
                    return Promise.resolve(
                        query.name === 'GP_MARITIME_SAML_DEFAULT' && (scenario.samlDefaultExists ?? true)
                            ? [{ id: SAML_DEFAULT_ID, name: query.name }]
                            : [],
                    );
                }
                if (query instanceof RetrieveSiteManagersByUserIdQuery) return firstPage(scenario.managers);
                if (query instanceof RetrieveSiteAuditorsByUserIdQuery) return firstPage(scenario.auditors);
                if (query instanceof RetrieveSiteSupportTeamMembersByUserIdQuery) return firstPage(scenario.members);
                if (query instanceof RetrieveSiteByIdQuery) {
                    return Promise.resolve({ customerKey: `customer-of-site-${query.siteId}` });
                }
                if (query instanceof RetrieveCustomersQuery) {
                    const siteId = Number(query.key?.replace('customer-of-site-', ''));

                    return Promise.resolve([
                        {
                            name: 'ACME',
                            beyondtrustInstanceId: BT_INSTANCE_ID,
                            businessUnit: scenario.businessUnitOfSite?.get(siteId) ?? BusinessUnit.MT,
                        },
                    ]);
                }

                return Promise.resolve([]);
            }),
        } as unknown as QueryBus;
    }

    function samlDefaultWorkflow(): BuSamlDefaultGroupPolicyWorkflow {
        return new BuSamlDefaultGroupPolicyWorkflow(queryBus, 'tx', BusinessUnit.MT, BT_INSTANCE_ID);
    }

    function fixedGroupPolicy<T>(id: number): T {
        return { getOrCreate: () => Promise.resolve({ id: id }) } as unknown as T;
    }

    function createManagerWorkflow(sourceType: UserSourceType): SiteManagerWorkflow {
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
            samlDefaultWorkflow(),
        );
    }

    function createAuditorWorkflow(sourceType: UserSourceType, isAdminOperator = false): SiteAuditorWorkflow {
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
            samlDefaultWorkflow(),
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

    function localGroupPolicyChanges(): ModifyUserGroupPoliciesCommand[] {
        return executedCommands.filter(
            (command): command is ModifyUserGroupPoliciesCommand => command instanceof ModifyUserGroupPoliciesCommand,
        );
    }

    function samlDefaultLookups(): number {
        const calls = (queryBus.execute as jest.Mock).mock.calls as unknown[][];

        return calls.filter(
            ([query]) => query instanceof RetrieveGroupPoliciesQuery && query.name === 'GP_MARITIME_SAML_DEFAULT',
        ).length;
    }

    describe('ingestion', () => {
        it('should add an external site manager to the SAML default policy of the Business Unit', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createManagerWorkflow(UserSourceType.External).getOrCreate();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [17, 18, SAML_DEFAULT_ID], []);
        });

        it('should add an external site auditor to it', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createAuditorWorkflow(UserSourceType.External).getOrCreate();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [10, 12, SAML_DEFAULT_ID], []);
        });

        it('should add an external auditor operator to it', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createAuditorWorkflow(UserSourceType.External, true).getOrCreate();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [10, 13, 11, 14, SAML_DEFAULT_ID], []);
        });

        it('should add an external site support team member to it', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT });

            await createSupportTeamMemberWorkflow(UserSourceType.External).getOrCreate();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [16, 11, 15, SAML_DEFAULT_ID], []);
        });

        it('should not add local users to it and not look the policy up for them', async () => {
            mockScenario({ account: LOCAL_ACCOUNT });

            await createManagerWorkflow(UserSourceType.Internal).getOrCreate();
            await createAuditorWorkflow(UserSourceType.Internal).getOrCreate();
            await createSupportTeamMemberWorkflow(UserSourceType.Internal).getOrCreate();

            expect(localGroupPolicyChanges().map((command) => command.groupPolicyIdsToAdd)).toEqual([
                [17, 18],
                [10, 12],
                [16, 11, 15],
            ]);
            expect(applyMemberships).not.toHaveBeenCalled();
            expect(samlDefaultLookups()).toBe(0);
        });

        it('should still apply the role policies of an external user when the SAML default policy does not exist', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT, samlDefaultExists: false });

            const siteAuditor = await createAuditorWorkflow(UserSourceType.External).getOrCreate();

            expect(siteAuditor.userId).toBe(EXTERNAL_ACCOUNT.id);
            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [10, 12], []);
        });
    });

    describe('removal', () => {
        const auditorRow = { id: 2, siteId: SITE_ID, userId: 9, sourceType: UserSourceType.External };

        it('should remove the SAML default policy together with the last role of an external user', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT, auditors: [auditorRow] });

            await createAuditorWorkflow(UserSourceType.External).delete();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [], [10, 12, SAML_DEFAULT_ID]);
            expect(executedCommands).toContainEqual(new DeleteUserCommand('tx', BT_INSTANCE_ID, 9));
        });

        it('should keep it while the external user holds another role in the same Business Unit', async () => {
            mockScenario({
                account: EXTERNAL_ACCOUNT,
                auditors: [auditorRow],
                managers: [{ id: 1, siteId: 6, userId: 9, sourceType: UserSourceType.External }],
            });

            await createAuditorWorkflow(UserSourceType.External).delete();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [], [10, 12]);
            expect(executedCommands.some((command) => command instanceof DeleteUserCommand)).toBe(false);
        });

        it('should remove it when the remaining roles of the external user are in another Business Unit', async () => {
            mockScenario({
                account: EXTERNAL_ACCOUNT,
                auditors: [auditorRow],
                managers: [{ id: 1, siteId: 6, userId: 9, sourceType: UserSourceType.External }],
                businessUnitOfSite: new Map([[6, BusinessUnit.OA]]),
            });

            await createAuditorWorkflow(UserSourceType.External).delete();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [], [10, 12, SAML_DEFAULT_ID]);
            expect(executedCommands.some((command) => command instanceof DeleteUserCommand)).toBe(false);
        });

        it('should remove it for an external site manager and an external support team member as well', async () => {
            mockScenario({
                account: EXTERNAL_ACCOUNT,
                managers: [{ id: 1, siteId: SITE_ID, userId: 9, sourceType: UserSourceType.External }],
            });
            await createManagerWorkflow(UserSourceType.External).delete();

            expect(applyMemberships).toHaveBeenLastCalledWith(EXTERNAL_ACCOUNT, [], [17, 18, SAML_DEFAULT_ID]);

            mockScenario({
                account: EXTERNAL_ACCOUNT,
                members: [{ id: 3, siteId: SITE_ID, userId: 9, sourceType: UserSourceType.External }],
            });
            await createSupportTeamMemberWorkflow(UserSourceType.External).delete();

            expect(applyMemberships).toHaveBeenLastCalledWith(EXTERNAL_ACCOUNT, [], [16, 11, 15, SAML_DEFAULT_ID]);
        });

        it('should not try to remove a policy that does not exist', async () => {
            mockScenario({ account: EXTERNAL_ACCOUNT, auditors: [auditorRow], samlDefaultExists: false });

            await createAuditorWorkflow(UserSourceType.External).delete();

            expect(applyMemberships).toHaveBeenCalledWith(EXTERNAL_ACCOUNT, [], [10, 12]);
        });

        it('should leave the removal of a local user unchanged', async () => {
            mockScenario({
                account: LOCAL_ACCOUNT,
                auditors: [{ id: 2, siteId: SITE_ID, userId: 7, sourceType: UserSourceType.Internal }],
            });

            await createAuditorWorkflow(UserSourceType.Internal).delete();

            expect(localGroupPolicyChanges().map((command) => command.groupPolicyIdsToRemove)).toEqual([[10, 12]]);
            expect(samlDefaultLookups()).toBe(0);
        });
    });
});
