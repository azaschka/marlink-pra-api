import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { RemoveUserFromGroupPolicyCommand } from '../../../group-policy-member/commands';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { UserSourceType } from '../../../user/enums';
import { SiteUserType } from '../../enums';
import { BuSamlDefaultGroupPolicyRetainedException, GroupPolicyAssignmentFailedException } from '../../exceptions';
import { BU_SAML_DEFAULT_GP_MAP, BuSamlDefaultGroupPolicyWorkflow } from './bu-saml-default-group-policy.workflow';
import { BuSupportGroupPolicyWorkflow } from './bu-support-group-policy.workflow';

describe('BuSamlDefaultGroupPolicyWorkflow (EXT-21, EXT-25)', () => {
    const TRANSACTION_ID = 'tx';
    const BT_INSTANCE_ID = 4;
    const GROUP_POLICY = { id: 30, name: 'GP_MARITIME_SAML_DEFAULT' };
    let queryBus: QueryBus;
    let commandBus: CommandBus;
    let execute: jest.Mock;
    let executeCommand: jest.Mock;

    beforeEach(() => {
        execute = jest.fn().mockResolvedValue([GROUP_POLICY]);
        queryBus = { execute: execute } as unknown as QueryBus;
        executeCommand = jest.fn().mockResolvedValue({ removed: true, stillHoldsGroupPolicy: false });
        commandBus = { execute: executeCommand } as unknown as CommandBus;
    });

    afterEach(() => jest.restoreAllMocks());

    function createWorkflow(businessUnit: BusinessUnit = BusinessUnit.MT): BuSamlDefaultGroupPolicyWorkflow {
        return new BuSamlDefaultGroupPolicyWorkflow(queryBus, commandBus, TRANSACTION_ID, businessUnit, BT_INSTANCE_ID);
    }

    it('should name one SAML default policy per Business Unit', () => {
        expect(BU_SAML_DEFAULT_GP_MAP).toEqual({
            [BusinessUnit.MT]: 'GP_MARITIME_SAML_DEFAULT',
            [BusinessUnit.OA]: 'GP_OMNIACCESS_SAML_DEFAULT',
            [BusinessUnit.TE]: 'GP_TELEMAR_SAML_DEFAULT',
            [BusinessUnit.EG]: 'GP_EEG_SAML_DEFAULT',
            [BusinessUnit.MC]: 'GP_CYBER_SAML_DEFAULT',
        });
        expect(Object.keys(BU_SAML_DEFAULT_GP_MAP).sort()).toEqual(Object.values(BusinessUnit).sort());
    });

    it('should return the policy of the Business Unit for an external user', async () => {
        const groupPolicy = await createWorkflow(BusinessUnit.OA).getFor(UserSourceType.External);

        expect(groupPolicy).toBe(GROUP_POLICY);
        expect(execute).toHaveBeenCalledWith(
            new RetrieveGroupPoliciesQuery(TRANSACTION_ID, BT_INSTANCE_ID, 1, 1, 'GP_OMNIACCESS_SAML_DEFAULT'),
        );
    });

    it('should return no policy for a local user and not look one up', async () => {
        expect(await createWorkflow().getFor(UserSourceType.Internal)).toBeNull();
        expect(execute).not.toHaveBeenCalled();
    });

    it('should return null and log the name once when the policy does not exist on the BeyondTrust instance', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        execute.mockResolvedValue([]);
        const workflow = createWorkflow();

        expect(await workflow.getFor(UserSourceType.External)).toBeNull();
        expect(await workflow.getFor(UserSourceType.External)).toBeNull();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('"GP_MARITIME_SAML_DEFAULT" not found'));
    });

    it('should not log anything when the policy exists', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        await createWorkflow().getFor(UserSourceType.External);

        expect(warn).not.toHaveBeenCalled();
    });

    it('should return null without a lookup for a Business Unit that has no mapping', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const workflow = createWorkflow('XX' as BusinessUnit);

        expect(workflow.groupPolicyName).toBeUndefined();
        expect(await workflow.getFor(UserSourceType.External)).toBeNull();
        expect(execute).not.toHaveBeenCalled();
    });

    it('should look the policy up once per workflow instance, also when it does not exist', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const workflow = createWorkflow();

        await workflow.getFor(UserSourceType.External);
        await workflow.getFor(UserSourceType.External);
        await workflow.get();

        expect(execute).toHaveBeenCalledTimes(1);

        execute.mockClear().mockResolvedValue([]);
        const workflowWithoutPolicy = createWorkflow();

        await workflowWithoutPolicy.get();
        await workflowWithoutPolicy.get();

        expect(execute).toHaveBeenCalledTimes(1);
    });

    it('should not cache a failed lookup', async () => {
        execute.mockRejectedValueOnce(new Error('pra-sync-api unavailable')).mockResolvedValue([GROUP_POLICY]);
        const workflow = createWorkflow();

        await expect(workflow.getFor(UserSourceType.External)).rejects.toThrow('pra-sync-api unavailable');
        expect(await workflow.getFor(UserSourceType.External)).toBe(GROUP_POLICY);
    });

    it('should expose the Business Unit it was created for', () => {
        expect(createWorkflow(BusinessUnit.TE).businessUnit).toBe(BusinessUnit.TE);
    });

    it('should leave the BU Operators policy lookup unchanged (R3.1-P003)', async () => {
        const workflow = new BuSupportGroupPolicyWorkflow(queryBus, TRANSACTION_ID, BusinessUnit.EG, BT_INSTANCE_ID);

        expect(workflow.groupPolicyName).toBe('GP_EEG_OPERATORS');
        expect(await workflow.get()).toBe(GROUP_POLICY);
        expect(execute).toHaveBeenCalledWith(
            new RetrieveGroupPoliciesQuery(TRANSACTION_ID, BT_INSTANCE_ID, 1, 1, 'GP_EEG_OPERATORS'),
        );
    });

    describe('removeFrom (MARLINKPRA-81)', () => {
        const SITE_USER = { sourceType: UserSourceType.External, email: 'p@example.com', userId: 9 };

        it('should remove the user, ask BeyondTrust whether it still holds the policy and have nothing to report', async () => {
            const retained = await createWorkflow().removeFrom(SiteUserType.SiteManager, SITE_USER);

            expect(executeCommand).toHaveBeenCalledWith(
                new RemoveUserFromGroupPolicyCommand(
                    TRANSACTION_ID,
                    BT_INSTANCE_ID,
                    GROUP_POLICY.id,
                    SITE_USER.userId,
                    true,
                ),
            );
            expect(retained).toBeNull();
        });

        it.each([
            ['no direct member and not listed', { removed: false, stillHoldsGroupPolicy: false }],
            ['removed and the check could not run', { removed: true, stillHoldsGroupPolicy: null }],
        ])('should have nothing to report: %s', async (_case, removal) => {
            executeCommand.mockResolvedValue(removal);

            expect(await createWorkflow().removeFrom(SiteUserType.SiteManager, SITE_USER)).toBeNull();
        });

        it('should do nothing for a local user', async () => {
            const retained = await createWorkflow().removeFrom(SiteUserType.SiteManager, {
                ...SITE_USER,
                sourceType: UserSourceType.Internal,
            });

            expect(retained).toBeNull();
            expect(execute).not.toHaveBeenCalled();
            expect(executeCommand).not.toHaveBeenCalled();
        });

        it('should remove nothing and report nothing when the policy does not exist', async () => {
            jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            execute.mockResolvedValue([]);

            expect(await createWorkflow().removeFrom(SiteUserType.SiteManager, SITE_USER)).toBeNull();
            expect(executeCommand).not.toHaveBeenCalled();
        });

        it.each([
            ['BeyondTrust still lists the policy', { removed: false, stillHoldsGroupPolicy: true }, 'still lists'],
            ['listed although removed', { removed: true, stillHoldsGroupPolicy: true }, 'still lists'],
            ['nothing removed and unknown', { removed: false, stillHoldsGroupPolicy: null }, 'could not be determined'],
        ])('should describe what stays: %s', async (_case, removal, expectedText) => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            executeCommand.mockResolvedValue(removal);

            const retained = await createWorkflow().removeFrom(SiteUserType.SiteAuditor, SITE_USER);

            expect(retained).toBeInstanceOf(BuSamlDefaultGroupPolicyRetainedException);
            expect(retained?.siteUserType).toBe(SiteUserType.SiteAuditor);
            expect(retained?.email).toBe(SITE_USER.email);
            expect(retained?.message).toContain(GROUP_POLICY.name);
            expect(retained?.message).toContain(expectedText);
            expect(warn).toHaveBeenCalledTimes(1);
        });

        it('should raise a failed removal for the user', async () => {
            executeCommand.mockRejectedValue(new Error('bt down'));

            const error = await createWorkflow()
                .removeFrom(SiteUserType.SiteManager, SITE_USER)
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(GroupPolicyAssignmentFailedException);
            const [failure] = (error as GroupPolicyAssignmentFailedException).failures;
            expect(failure?.groupPolicyId).toBe(GROUP_POLICY.id);
            expect(failure?.operation).toBe('remove');
            expect(failure?.message).toContain('bt down');
        });
    });
});
