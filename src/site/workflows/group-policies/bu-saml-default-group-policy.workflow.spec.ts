import { QueryBus } from '@nestjs/cqrs';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { UserSourceType } from '../../../user/enums';
import { BU_SAML_DEFAULT_GP_MAP, BuSamlDefaultGroupPolicyWorkflow } from './bu-saml-default-group-policy.workflow';
import { BuSupportGroupPolicyWorkflow } from './bu-support-group-policy.workflow';

describe('BuSamlDefaultGroupPolicyWorkflow (EXT-21)', () => {
    const TRANSACTION_ID = 'tx';
    const BT_INSTANCE_ID = 4;
    const GROUP_POLICY = { id: 30, name: 'GP_MARITIME_SAML_DEFAULT' };
    let queryBus: QueryBus;
    let execute: jest.Mock;

    beforeEach(() => {
        execute = jest.fn().mockResolvedValue([GROUP_POLICY]);
        queryBus = { execute: execute } as unknown as QueryBus;
    });

    afterEach(() => jest.restoreAllMocks());

    function createWorkflow(businessUnit: BusinessUnit = BusinessUnit.MT): BuSamlDefaultGroupPolicyWorkflow {
        return new BuSamlDefaultGroupPolicyWorkflow(queryBus, TRANSACTION_ID, businessUnit, BT_INSTANCE_ID);
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

    it('should return null when the policy does not exist on the BeyondTrust instance', async () => {
        execute.mockResolvedValue([]);

        expect(await createWorkflow().getFor(UserSourceType.External)).toBeNull();
    });

    it('should return null without a lookup for a Business Unit that has no mapping', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const workflow = createWorkflow('XX' as BusinessUnit);

        expect(workflow.groupPolicyName).toBeUndefined();
        expect(await workflow.getFor(UserSourceType.External)).toBeNull();
        expect(execute).not.toHaveBeenCalled();
    });

    it('should look the policy up once per workflow instance, also when it does not exist', async () => {
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
});
