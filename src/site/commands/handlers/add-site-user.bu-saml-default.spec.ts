import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { RemoveUserFromGroupPolicyCommand } from '../../../group-policy-member/commands';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { UserSourceType } from '../../../user/enums';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../../enums';
import { GroupPolicyAssignmentFailedException } from '../../exceptions';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteAuditorWorkflow } from '../../workflows/site-auditor.workflow';
import { SiteManagerWorkflow } from '../../workflows/site-manager.workflow';
import { SiteSupportTeamMemberWorkflow } from '../../workflows/site-support-team-member.workflow';
import { AddSiteAuditorCommand } from '../add-site-auditor.command';
import { AddSiteManagerCommand } from '../add-site-manager.command';
import { AddSiteSupportTeamMemberCommand } from '../add-site-support-team-member.command';
import { AddSiteAuditorCommandHandler } from './add-site-auditor.command-handler';
import { AddSiteManagerCommandHandler } from './add-site-manager.command-handler';
import { AddSiteSupportTeamMemberCommandHandler } from './add-site-support-team-member.command-handler';

/**
 * MARLINKPRA-81: adding one role to a site takes an external user out of the SAML default policy of the Business Unit
 * as well, after the role. These requests have no report, so a failed removal fails the request.
 */
describe('Adding a site user: SAML default group policy (MARLINKPRA-81)', () => {
    const SITE = {
        id: 5,
        name: 'SITE',
        key: 'KEY',
        customerKey: 'ACME',
        siteManagers: [],
        siteAuditors: [],
        siteSupportTeamMembers: [],
    };
    const CUSTOMER = { key: 'ACME', name: 'ACME', beyondtrustInstanceId: 1, businessUnit: BusinessUnit.MT };
    const EMAIL = 'p@example.com';
    const appConfigService = {
        user: { localSecurityProviderIds: [1] },
        site: {
            user: { siteAuditor: { publicDisplayNamePrefix: 'A' }, siteManager: { publicDisplayNamePrefix: 'M' } },
        },
    } as unknown as AppConfigService;

    let executeCommand: jest.Mock;
    let createRow: jest.Mock;

    const queryBus = {
        execute: jest.fn().mockImplementation((query: unknown) => {
            if (query instanceof RetrieveCustomersQuery) {
                return Promise.resolve([CUSTOMER]);
            }

            return Promise.resolve(
                query instanceof RetrieveGroupPoliciesQuery ? [{ id: 30, name: 'GP_MARITIME_SAML_DEFAULT' }] : [],
            );
        }),
    } as unknown as QueryBus;

    function handlerDependencies() {
        return [
            appConfigService,
            { execute: executeCommand } as unknown as CommandBus,
            queryBus,
            { publish: jest.fn() } as unknown as EventBus,
            { findOneById: jest.fn().mockResolvedValue(SITE) } as unknown as SiteRepositoryService,
            { create: createRow },
        ] as const;
    }

    const cases = [
        {
            role: 'site manager',
            workflow: SiteManagerWorkflow,
            run: (sourceType: UserSourceType) =>
                new AddSiteManagerCommandHandler(
                    ...(handlerDependencies() as unknown as ConstructorParameters<typeof AddSiteManagerCommandHandler>),
                ).execute(new AddSiteManagerCommand('tx', 5, EMAIL, EMAIL, sourceType)),
        },
        {
            role: 'site auditor',
            workflow: SiteAuditorWorkflow,
            run: (sourceType: UserSourceType) =>
                new AddSiteAuditorCommandHandler(
                    ...(handlerDependencies() as unknown as ConstructorParameters<typeof AddSiteAuditorCommandHandler>),
                ).execute(new AddSiteAuditorCommand('tx', 5, EMAIL, EMAIL, false, sourceType)),
        },
        {
            role: 'site support team member',
            workflow: SiteSupportTeamMemberWorkflow,
            run: (sourceType: UserSourceType) =>
                new AddSiteSupportTeamMemberCommandHandler(
                    ...(handlerDependencies() as unknown as ConstructorParameters<
                        typeof AddSiteSupportTeamMemberCommandHandler
                    >),
                ).execute(
                    new AddSiteSupportTeamMemberCommand(
                        'tx',
                        5,
                        'P',
                        'Erson',
                        EMAIL,
                        'TEAM',
                        SiteSupportTeamAccessLevel.Limited,
                        SiteSupportTeamTrustLevel.RequireAuth,
                        sourceType,
                    ),
                ),
        },
    ];

    beforeEach(() => {
        createRow = jest.fn().mockResolvedValue({ id: 1 });
        executeCommand = jest.fn().mockResolvedValue({ removed: true, stillHoldsGroupPolicy: false });
    });

    afterEach(() => jest.restoreAllMocks());

    describe.each(cases)('$role', ({ workflow, run }) => {
        function mockRole(sourceType: UserSourceType): void {
            jest.spyOn(workflow.prototype as { getOrCreate: () => Promise<unknown> }, 'getOrCreate').mockResolvedValue({
                email: EMAIL,
                username: EMAIL,
                sourceType: sourceType,
                userId: 9,
            });
        }

        it('should remove an external user from the policy and store the role', async () => {
            mockRole(UserSourceType.External);

            await run(UserSourceType.External);

            expect(executeCommand).toHaveBeenCalledWith(new RemoveUserFromGroupPolicyCommand('tx', 1, 30, 9, true));
            expect(createRow).toHaveBeenCalledTimes(1);
        });

        it('should not store the role and fail the request when the removal fails', async () => {
            mockRole(UserSourceType.External);
            executeCommand.mockRejectedValue(new Error('bt down'));

            await expect(run(UserSourceType.External)).rejects.toBeInstanceOf(GroupPolicyAssignmentFailedException);
            expect(createRow).not.toHaveBeenCalled();
        });

        it('should store the role when the user keeps the policy, which the log names', async () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            mockRole(UserSourceType.External);
            executeCommand.mockResolvedValue({ removed: false, stillHoldsGroupPolicy: true });

            await run(UserSourceType.External);

            expect(createRow).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledTimes(1);
        });

        it('should not touch a local user', async () => {
            mockRole(UserSourceType.Internal);

            await run(UserSourceType.Internal);

            expect(executeCommand).not.toHaveBeenCalled();
            expect(createRow).toHaveBeenCalledTimes(1);
        });
    });
});
