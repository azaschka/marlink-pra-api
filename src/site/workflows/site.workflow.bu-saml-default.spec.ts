import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { RemoveUserFromGroupPolicyCommand } from '../../group-policy-member/commands';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { UserSourceType } from '../../user/enums';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel, SiteUserType } from '../enums';
import { BuSamlDefaultGroupPolicyRetainedException, GroupPolicyAssignmentFailedException } from '../exceptions';
import {
    AdministratorGroupPolicyWorkflow,
    BuSupportGroupPolicyWorkflow,
    ManagerGroupPolicyWorkflow,
    MarlinkOperatorGroupPolicyWorkflow,
    MarlinkSuperuserGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
} from './group-policies';
import { AuthJumpPolicyWorkflow, NoAuthJumpPolicyWorkflow, NotifyJumpPolicyWorkflow } from './jump-policies';
import { JumpointsWorkflow } from './jumpoints';
import { SiteAuditorWorkflow } from './site-auditor.workflow';
import { SiteManagerWorkflow } from './site-manager.workflow';
import { SiteSupportTeamMemberWorkflow } from './site-support-team-member.workflow';
import { SiteWorkflow } from './site.workflow';
import { TeamWorkflow } from './teams';
import { SiteManagerUserWorkflow } from './users';

/**
 * MARLINKPRA-81: the run takes external users out of the SAML default policy of the Business Unit after all role
 * workflows. The role workflows are stubbed here; the policy lookup and the removal are real down to the command bus.
 */
describe('SiteWorkflow: SAML default group policy (MARLINKPRA-81)', () => {
    const SAML_DEFAULT_ID = 30;
    const MANAGER_EMAIL = 'manager@example.com';
    const AUDITOR_EMAIL = 'auditor@example.com';
    const MEMBER_EMAIL = 'member@example.com';
    const external = { sourceType: UserSourceType.External };
    const manager = { ...external, username: MANAGER_EMAIL, email: MANAGER_EMAIL };
    const auditor = { ...external, username: AUDITOR_EMAIL, email: AUDITOR_EMAIL, isAdminOperator: false };
    const member = {
        ...external,
        firstname: 'P',
        lastname: 'Erson',
        email: MEMBER_EMAIL,
        supportTeamName: 'TEAM',
        supportTeamAccessLevel: SiteSupportTeamAccessLevel.Limited,
        supportTeamTrustLevel: SiteSupportTeamTrustLevel.RequireAuth,
    };

    let order: string[];
    let executeCommand: jest.Mock;
    let removalResult: (userId: number) => Promise<unknown>;

    function mockGetOrCreate(workflow: { prototype: object }, result: unknown): jest.SpyInstance {
        return jest
            .spyOn(workflow.prototype as { getOrCreate: () => Promise<unknown> }, 'getOrCreate')
            .mockResolvedValue(result);
    }

    function mockRole(workflow: { prototype: object }, label: string, result: () => Promise<unknown>): void {
        mockGetOrCreate(workflow, undefined).mockImplementation(() => {
            order.push(label);

            return result();
        });
    }

    function createSiteWorkflow(
        siteUsers: { managers?: object[]; auditors?: object[]; members?: object[] } = {},
    ): SiteWorkflow {
        return new SiteWorkflow(
            {
                user: { localSecurityProviderIds: [1] },
                site: {
                    user: {
                        siteAuditor: { publicDisplayNamePrefix: 'A' },
                        siteManager: { publicDisplayNamePrefix: 'M' },
                    },
                },
            } as unknown as AppConfigService,
            {
                execute: jest
                    .fn()
                    .mockImplementation((query: unknown) =>
                        Promise.resolve(
                            query instanceof RetrieveGroupPoliciesQuery
                                ? [{ id: SAML_DEFAULT_ID, name: 'GP_MARITIME_SAML_DEFAULT' }]
                                : [],
                        ),
                    ),
            } as unknown as QueryBus,
            { execute: executeCommand } as unknown as CommandBus,
            'tx',
            'SITE',
            'KEY',
            (siteUsers.managers ?? [manager]) as never[],
            (siteUsers.auditors ?? []) as never[],
            (siteUsers.members ?? []) as never[],
            [],
            'ACME',
            BusinessUnit.MT,
            1,
        );
    }

    function removals(): RemoveUserFromGroupPolicyCommand[] {
        return (executeCommand.mock.calls as unknown[][])
            .map(([command]) => command)
            .filter(
                (command): command is RemoveUserFromGroupPolicyCommand =>
                    command instanceof RemoveUserFromGroupPolicyCommand,
            );
    }

    beforeEach(() => {
        order = [];
        removalResult = () => Promise.resolve({ removed: true, stillHoldsGroupPolicy: false });
        executeCommand = jest.fn().mockImplementation((command: unknown) => {
            if (command instanceof RemoveUserFromGroupPolicyCommand) {
                order.push('leave');

                return removalResult(command.userId);
            }

            return Promise.resolve({});
        });

        for (const workflow of [
            ManagerGroupPolicyWorkflow,
            OperatorGroupPolicyWorkflow,
            AdministratorGroupPolicyWorkflow,
            MarlinkOperatorGroupPolicyWorkflow,
            MarlinkSuperuserGroupPolicyWorkflow,
            TeamWorkflow,
            AuthJumpPolicyWorkflow,
            NoAuthJumpPolicyWorkflow,
            NotifyJumpPolicyWorkflow,
        ]) {
            mockGetOrCreate(workflow, { id: 1 });
        }
        mockGetOrCreate(JumpointsWorkflow, []);
        mockGetOrCreate(SiteManagerUserWorkflow, { id: 9 });
        mockRole(SiteManagerWorkflow, 'manager', () => Promise.resolve({ ...manager, userId: 9 }));
        mockRole(SiteAuditorWorkflow, 'auditor', () => Promise.resolve({ ...auditor, userId: 10 }));
        mockRole(SiteSupportTeamMemberWorkflow, 'member', () => Promise.resolve({ ...member, userId: 11 }));
        jest.spyOn(BuSupportGroupPolicyWorkflow.prototype, 'get').mockResolvedValue({ id: 2 } as never);
    });

    afterEach(() => jest.restoreAllMocks());

    it('should remove every external user after all role workflows, asking for the verification', async () => {
        const result = await createSiteWorkflow({
            managers: [manager],
            auditors: [auditor],
            members: [member],
        }).getOrCreate();

        expect(order).toEqual(['manager', 'auditor', 'member', 'leave', 'leave', 'leave']);
        expect(removals()).toEqual([
            new RemoveUserFromGroupPolicyCommand('tx', 1, SAML_DEFAULT_ID, 9, true),
            new RemoveUserFromGroupPolicyCommand('tx', 1, SAML_DEFAULT_ID, 10, true),
            new RemoveUserFromGroupPolicyCommand('tx', 1, SAML_DEFAULT_ID, 11, true),
        ]);
        expect(result.errorReport.items).toEqual([]);
    });

    it('should handle a user with several roles once', async () => {
        mockRole(SiteAuditorWorkflow, 'auditor', () => Promise.resolve({ ...auditor, userId: 9 }));

        await createSiteWorkflow({ managers: [manager], auditors: [auditor] }).getOrCreate();

        expect(removals().map((command) => command.userId)).toEqual([9]);
    });

    it('should leave a user in the policy when one of its roles failed, whatever the case of the email', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const upperCaseEmail = MANAGER_EMAIL.toUpperCase();
        mockRole(SiteManagerWorkflow, 'manager', () =>
            Promise.resolve({ ...manager, email: upperCaseEmail, userId: 9 }),
        );
        mockRole(SiteAuditorWorkflow, 'auditor', () => Promise.reject(new Error('role failed')));

        const result = await createSiteWorkflow({
            managers: [manager],
            auditors: [{ ...auditor, email: MANAGER_EMAIL }],
        }).getOrCreate();

        expect(removals()).toEqual([]);
        expect(result.siteManagers.map((siteManager) => siteManager.email)).toEqual([upperCaseEmail]);
    });

    it('should not touch a local user', async () => {
        mockRole(SiteManagerWorkflow, 'manager', () =>
            Promise.resolve({ ...manager, sourceType: UserSourceType.Internal, userId: 9 }),
        );

        await createSiteWorkflow().getOrCreate();

        expect(removals()).toEqual([]);
    });

    it('should report a user that keeps the policy and still return the user', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        removalResult = () => Promise.resolve({ removed: false, stillHoldsGroupPolicy: true });

        const result = await createSiteWorkflow().getOrCreate();

        expect(result.siteManagers.map((siteManager) => siteManager.email)).toEqual([MANAGER_EMAIL]);
        expect(result.unresolvedEmails.siteManagers).toEqual([]);
        expect(result.errorReport.items).toEqual([
            expect.objectContaining({
                type: BuSamlDefaultGroupPolicyRetainedException.name,
                siteUserType: SiteUserType.SiteManager,
                email: MANAGER_EMAIL,
                operation: 'add',
            }),
        ]);
    });

    it('should keep the user on the site, report a failed removal and go on with the next user', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        removalResult = (userId) => (userId === 9 ? Promise.reject(new Error('bt down')) : Promise.resolve({}));

        const result = await createSiteWorkflow({ managers: [manager], auditors: [auditor] }).getOrCreate();

        expect(result.siteManagers.map((siteManager) => siteManager.email)).toEqual([MANAGER_EMAIL]);
        expect(result.unresolvedEmails.siteManagers).toEqual([]);
        expect(removals().map((command) => command.userId)).toEqual([9, 10]);
        expect(result.errorReport.items).toEqual([
            expect.objectContaining({
                type: GroupPolicyAssignmentFailedException.name,
                siteUserType: SiteUserType.SiteManager,
                email: MANAGER_EMAIL,
                operation: 'add',
            }),
        ]);
    });
});
