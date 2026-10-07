import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { UserSourceType } from '../../user/enums';
import { PartialSiteAuditor, PartialSiteManager, PartialSiteSupportTeamMember } from '../models';
import {
    AdministratorGroupPolicyWorkflow,
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
 * EXT-21: SiteWorkflow reports a missing SAML default group policy of the Business Unit once per run. The role
 * workflows are replaced by stubs here; their handling of the policy is covered by
 * site-user-bu-saml-default.workflow.spec.ts.
 */
describe('SiteWorkflow.getOrCreate, missing BU SAML default group policy (EXT-21)', () => {
    const BT_INSTANCE_ID = 4;
    const SAML_DEFAULT_NAME = 'GP_MARITIME_SAML_DEFAULT';
    const manager = (sourceType: UserSourceType): PartialSiteManager => ({
        username: 'manager@example.com',
        email: 'manager@example.com',
        sourceType: sourceType,
    });
    const auditor = (sourceType: UserSourceType): PartialSiteAuditor => ({
        username: 'auditor@example.com',
        email: 'auditor@example.com',
        isAdminOperator: false,
        sourceType: sourceType,
    });

    let queryBus: QueryBus;
    let commandBus: CommandBus;
    /** What the lookup of GP_MARITIME_SAML_DEFAULT answers; an Error makes the lookup fail. */
    let samlDefaultLookupResult: object[] | Error;

    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        const stub = (workflow: { prototype: object }, value: unknown) =>
            jest
                .spyOn(workflow.prototype as { getOrCreate: () => Promise<unknown> }, 'getOrCreate')
                .mockResolvedValue(value);

        stub(ManagerGroupPolicyWorkflow, { id: 1 });
        stub(OperatorGroupPolicyWorkflow, { id: 2 });
        stub(AdministratorGroupPolicyWorkflow, { id: 3 });
        stub(MarlinkOperatorGroupPolicyWorkflow, { id: 4 });
        stub(MarlinkSuperuserGroupPolicyWorkflow, { id: 5 });
        stub(TeamWorkflow, { id: 6 });
        stub(JumpointsWorkflow, []);
        stub(AuthJumpPolicyWorkflow, { id: 7 });
        stub(NoAuthJumpPolicyWorkflow, { id: 8 });
        stub(NotifyJumpPolicyWorkflow, { id: 9 });
        stub(SiteManagerUserWorkflow, { id: 20 });
        stub(SiteManagerWorkflow, { userId: 20 });
        stub(SiteAuditorWorkflow, { userId: 21 });
        stub(SiteSupportTeamMemberWorkflow, { userId: 22 });

        samlDefaultLookupResult = [];
        queryBus = {
            execute: jest.fn().mockImplementation((query: unknown) => {
                if (query instanceof RetrieveGroupPoliciesQuery && query.name === SAML_DEFAULT_NAME) {
                    return samlDefaultLookupResult instanceof Error
                        ? Promise.reject(samlDefaultLookupResult)
                        : Promise.resolve(samlDefaultLookupResult);
                }

                return Promise.resolve([]);
            }),
        } as unknown as QueryBus;
        commandBus = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as CommandBus;
    });

    afterEach(() => jest.restoreAllMocks());

    function createWorkflow(
        siteManagers: PartialSiteManager[],
        siteAuditors: PartialSiteAuditor[] = [],
        siteSupportTeamMembers: PartialSiteSupportTeamMember[] = [],
    ): SiteWorkflow {
        return new SiteWorkflow(
            { user: { localSecurityProviderIds: [1] } } as unknown as AppConfigService,
            queryBus,
            commandBus,
            'tx',
            'SITE',
            'KEY',
            siteManagers,
            siteAuditors,
            siteSupportTeamMembers,
            [],
            'ACME',
            BusinessUnit.MT,
            BT_INSTANCE_ID,
        );
    }

    function samlDefaultLookups(): number {
        const calls = (queryBus.execute as jest.Mock).mock.calls as unknown[][];

        return calls.filter(
            ([query]) => query instanceof RetrieveGroupPoliciesQuery && query.name === SAML_DEFAULT_NAME,
        ).length;
    }

    it('should report the missing policy once, however many external users the site has', async () => {
        const result = await createWorkflow(
            [manager(UserSourceType.External)],
            [auditor(UserSourceType.External), auditor(UserSourceType.Internal)],
        ).getOrCreate();

        expect(result.errorReport.items).toEqual([
            {
                type: 'BuSamlDefaultGroupPolicyNotFoundException',
                message: expect.stringContaining(`"${SAML_DEFAULT_NAME}"`) as string,
            },
        ]);
        expect(result.errorReport.items[0]?.message).toContain(`BeyondTrust instance ${BT_INSTANCE_ID}`);
        expect(result.siteManagers).toHaveLength(1);
        expect(result.siteAuditors).toHaveLength(2);
        expect(result.unresolvedEmails).toEqual({ siteManagers: [], siteAuditors: [], siteSupportTeamMembers: [] });
    });

    it('should report nothing when the policy exists', async () => {
        samlDefaultLookupResult = [{ id: 30, name: SAML_DEFAULT_NAME }];

        const result = await createWorkflow([manager(UserSourceType.External)]).getOrCreate();

        expect(result.errorReport.items).toEqual([]);
    });

    it('should neither look the policy up nor report it for a site with local users only', async () => {
        const result = await createWorkflow(
            [manager(UserSourceType.Internal)],
            [auditor(UserSourceType.Internal)],
        ).getOrCreate();

        expect(result.errorReport.items).toEqual([]);
        expect(samlDefaultLookups()).toBe(0);
    });

    it('should not fail the run and not report a missing policy when the lookup itself fails', async () => {
        samlDefaultLookupResult = new Error('pra-sync-api unavailable');

        const result = await createWorkflow([manager(UserSourceType.External)]).getOrCreate();

        expect(result.errorReport.items).toEqual([]);
        expect(result.siteManagers).toHaveLength(1);
    });
});
