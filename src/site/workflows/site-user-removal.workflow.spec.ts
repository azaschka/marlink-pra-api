import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { RetrieveCustomersQuery } from '../../customer/queries';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { DeleteUserCommand } from '../../user/commands';
import { UserSourceType } from '../../user/enums';
import { RetrieveUsersQuery } from '../../user/queries';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel, SiteUserType } from '../enums';
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
    BuSupportGroupPolicyWorkflow,
    FullAccessGroupPolicyWorkflow,
    LimitedAccessGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
    SupportTeamGroupPolicyWorkflow,
} from './group-policies';
import { JumpointsWorkflow } from './jumpoints';
import { SiteAuditorWorkflow } from './site-auditor.workflow';
import { SiteSupportTeamMemberWorkflow } from './site-support-team-member.workflow';

/**
 * EXT-03: removing one site role of an account that holds other roles. Group policy ids used below:
 * ADMINISTRATORS_ACME 10, OPERATORS (site 5) 11, ADMINISTRATOR_ACCESS 12, ADMIN_OPERATOR_ACCESS 13, FULL_ACCESS 14,
 * LIMITED_ACCESS 15, support team policy 16.
 */
describe('Site user removal across roles (EXT-03)', () => {
    const SITE_ID = 5;
    const ACCOUNT = { id: 7, username: 'p@example.com', email: 'p@example.com', securityProviderId: 1 };
    let queryBus: QueryBus;
    let commandBus: CommandBus;
    let executedCommands: unknown[];

    const appConfigService = {
        user: { localSecurityProviderIds: [1] },
        site: { user: { siteAuditor: { publicDisplayNamePrefix: 'A' } } },
    } as unknown as AppConfigService;

    beforeEach(() => {
        jest.spyOn(AdministratorAccessGroupPolicyWorkflow.prototype, 'getOrCreate').mockResolvedValue({
            id: 12,
        } as never);
        jest.spyOn(AdminOperatorAccessGroupPolicyWorkflow.prototype, 'getOrCreate').mockResolvedValue({
            id: 13,
        } as never);
        jest.spyOn(FullAccessGroupPolicyWorkflow.prototype, 'getOrCreate').mockResolvedValue({ id: 14 } as never);
        jest.spyOn(LimitedAccessGroupPolicyWorkflow.prototype, 'getOrCreate').mockResolvedValue({ id: 15 } as never);
        jest.spyOn(SupportTeamGroupPolicyWorkflow.prototype, 'getOrCreate').mockResolvedValue({ id: 16 } as never);
        executedCommands = [];
        commandBus = {
            execute: jest.fn().mockImplementation((command: unknown) => {
                executedCommands.push(command);
                return Promise.resolve([]);
            }),
        } as unknown as CommandBus;
    });

    afterEach(() => jest.restoreAllMocks());

    function mockRows(rows: { managers?: object[]; auditors?: object[]; members?: object[] }): void {
        queryBus = {
            execute: jest.fn().mockImplementation((query: { pageNumber?: number }) => {
                const firstPage = <T>(items: T[]) => Promise.resolve(query.pageNumber === 1 ? items : []);
                if (query instanceof RetrieveUsersQuery) return firstPage([ACCOUNT]);
                if (query instanceof RetrieveSiteManagersByUserIdQuery) return firstPage(rows.managers ?? []);
                if (query instanceof RetrieveSiteAuditorsByUserIdQuery) return firstPage(rows.auditors ?? []);
                if (query instanceof RetrieveSiteSupportTeamMembersByUserIdQuery) return firstPage(rows.members ?? []);
                if (query instanceof RetrieveSiteByIdQuery) return Promise.resolve({ customerKey: 'C1' });
                if (query instanceof RetrieveCustomersQuery) {
                    return Promise.resolve([{ name: 'ACME', beyondtrustInstanceId: 1 }]);
                }
                return Promise.resolve([]);
            }),
        } as unknown as QueryBus;
    }

    function removedGroupPolicyIds(): number[] {
        return executedCommands
            .filter(
                (command): command is ModifyUserGroupPoliciesCommand =>
                    command instanceof ModifyUserGroupPoliciesCommand,
            )
            .flatMap((command) => command.groupPolicyIdsToRemove);
    }

    it('should not delete a local account that is still the site manager of the same site', async () => {
        mockRows({
            managers: [{ id: 1, siteId: SITE_ID, userId: 7 }],
            auditors: [{ id: 2, siteId: SITE_ID, userId: 7, isAdminOperator: false }],
        });

        await new SiteAuditorWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            'tx',
            {
                id: 2,
                siteId: SITE_ID,
                username: 'p@example.com',
                email: 'p@example.com',
                isAdminOperator: false,
                sourceType: UserSourceType.Internal,
            },
            'ACME',
            1,
            { getOrCreate: () => Promise.resolve({ id: 10 }) } as unknown as AdministratorGroupPolicyWorkflow,
            { getOrCreate: () => Promise.resolve({ id: 11 }) } as unknown as OperatorGroupPolicyWorkflow,
        ).delete();

        expect(executedCommands.some((command) => command instanceof DeleteUserCommand)).toBe(false);
        expect(removedGroupPolicyIds()).toEqual([10, 12]);
    });

    it('should delete the local account when no other role is left', async () => {
        mockRows({ auditors: [{ id: 2, siteId: SITE_ID, userId: 7, isAdminOperator: false }] });

        await new SiteAuditorWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            'tx',
            {
                id: 2,
                siteId: SITE_ID,
                username: 'p@example.com',
                email: 'p@example.com',
                isAdminOperator: false,
                sourceType: UserSourceType.Internal,
            },
            'ACME',
            1,
            { getOrCreate: () => Promise.resolve({ id: 10 }) } as unknown as AdministratorGroupPolicyWorkflow,
            { getOrCreate: () => Promise.resolve({ id: 11 }) } as unknown as OperatorGroupPolicyWorkflow,
        ).delete();

        expect(executedCommands.some((command) => command instanceof DeleteUserCommand)).toBe(true);
    });

    it('should keep OPERATORS and FULL_ACCESS for a support team member who is still an auditor operator of the site', async () => {
        mockRows({
            auditors: [{ id: 2, siteId: SITE_ID, userId: 7, isAdminOperator: true }],
            members: [
                {
                    id: 3,
                    siteId: SITE_ID,
                    userId: 7,
                    supportTeamName: 'TEAM_A',
                    supportTeamAccessLevel: SiteSupportTeamAccessLevel.Full,
                },
            ],
        });

        await new SiteSupportTeamMemberWorkflow(
            { ...appConfigService, site: { user: {} } } as unknown as AppConfigService,
            queryBus,
            commandBus,
            'tx',
            {
                id: 3,
                siteId: SITE_ID,
                firstname: 'P',
                lastname: 'Erson',
                email: 'p@example.com',
                supportTeamName: 'TEAM_A',
                supportTeamAccessLevel: SiteSupportTeamAccessLevel.Full,
                supportTeamTrustLevel: SiteSupportTeamTrustLevel.RequireAuth,
                sourceType: UserSourceType.Internal,
            },
            'ACME',
            1,
            { getOrCreate: () => Promise.resolve({ id: 10 }) } as unknown as AdministratorGroupPolicyWorkflow,
            { getOrCreate: () => Promise.resolve({ id: 11 }) } as unknown as OperatorGroupPolicyWorkflow,
            {} as JumpointsWorkflow,
            {} as BuSupportGroupPolicyWorkflow,
        ).delete();

        expect(removedGroupPolicyIds()).toEqual([16]);
        expect(executedCommands.some((command) => command instanceof DeleteUserCommand)).toBe(false);
    });

    it('should not count a role that is removed in the same operation', async () => {
        mockRows({
            auditors: [{ id: 2, siteId: SITE_ID, userId: 7, isAdminOperator: true }],
            members: [
                {
                    id: 3,
                    siteId: SITE_ID,
                    userId: 7,
                    supportTeamName: 'TEAM_A',
                    supportTeamAccessLevel: SiteSupportTeamAccessLevel.Full,
                },
            ],
        });

        await new SiteSupportTeamMemberWorkflow(
            { ...appConfigService, site: { user: {} } } as unknown as AppConfigService,
            queryBus,
            commandBus,
            'tx',
            {
                id: 3,
                siteId: SITE_ID,
                firstname: 'P',
                lastname: 'Erson',
                email: 'p@example.com',
                supportTeamName: 'TEAM_A',
                supportTeamAccessLevel: SiteSupportTeamAccessLevel.Full,
                supportTeamTrustLevel: SiteSupportTeamTrustLevel.RequireAuth,
                sourceType: UserSourceType.Internal,
            },
            'ACME',
            1,
            { getOrCreate: () => Promise.resolve({ id: 10 }) } as unknown as AdministratorGroupPolicyWorkflow,
            { getOrCreate: () => Promise.resolve({ id: 11 }) } as unknown as OperatorGroupPolicyWorkflow,
            {} as JumpointsWorkflow,
            {} as BuSupportGroupPolicyWorkflow,
        ).delete([{ siteUserType: SiteUserType.SiteAuditor, id: 2, siteId: SITE_ID }]);

        expect(removedGroupPolicyIds()).toEqual([16, 11, 14]);
        expect(executedCommands.some((command) => command instanceof DeleteUserCommand)).toBe(true);
    });
});
