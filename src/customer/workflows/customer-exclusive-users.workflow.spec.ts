import { QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { RetrieveGroupPolicyMembersQuery } from '../../group-policy-member/queries';
import { RetrieveCustomersQuery } from '../queries';
import {
    RetrieveSiteAuditorsByUserIdQuery,
    RetrieveSiteByIdQuery,
    RetrieveSiteManagersByUserIdQuery,
    RetrieveSitesQuery,
    RetrieveSiteSupportTeamMembersByUserIdQuery,
} from '../../site/queries';
import {
    AdministratorGroupPolicyWorkflow as SiteAdministratorGroupPolicyWorkflow,
    ManagerGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
    SupportTeamGroupPolicyWorkflow,
} from '../../site/workflows/group-policies';
import { Customer } from '../models';
import { AdministratorGroupPolicyWorkflow } from './administrator-group-policy.workflow';
import { CustomerExclusiveUsersWorkflow } from './customer-exclusive-users.workflow';

/**
 * EXT-27: users whose login follows the status of a customer.
 *
 * Customer TELEMAR (key TEL, instance 7) with site HQ (id 100, key K1) and support team TEAM_A. Policies returned
 * by the substring search, with their members:
 *   1 ADMINISTRATORS_TELEMAR        user 11, an identity provider group
 *   2 MANAGERS_TELEMAR_HQ_K1        user 12
 *   3 OPERATORS_TELEMAR_HQ_K1       user 13
 *   4 TELEMAR_TEAM_A                users 14, 15, 16
 *  90 GP_TELEMAR_SAML_DEFAULT       user 50 (no site role)
 *  91 GP_TELEMAR_OPERATORS          user 51 (no site role)
 *  92 ADMINISTRATORS_TELEMARINE     user 52 (no site role)
 */
describe('CustomerExclusiveUsersWorkflow (EXT-27)', () => {
    const CUSTOMER = { id: 1, key: 'TEL', name: 'Telemar', beyondtrustInstanceId: 7 } as Customer;
    const appConfigService = {
        site: {
            groupPolicy: {
                managerPrefix: 'MANAGERS_',
                operatorPrefix: 'OPERATORS_',
                administratorPrefix: 'ADMINISTRATORS_',
            },
        },
        customer: { groupPolicy: { administratorPrefix: 'ADMINISTRATORS_' } },
    } as unknown as AppConfigService;

    const GROUP_POLICIES = [
        { id: 1, name: 'ADMINISTRATORS_TELEMAR' },
        { id: 2, name: 'MANAGERS_TELEMAR_HQ_K1' },
        { id: 3, name: 'OPERATORS_TELEMAR_HQ_K1' },
        { id: 4, name: 'TELEMAR_TEAM_A' },
        { id: 90, name: 'GP_TELEMAR_SAML_DEFAULT' },
        { id: 91, name: 'GP_TELEMAR_OPERATORS' },
        { id: 92, name: 'ADMINISTRATORS_TELEMARINE' },
    ];
    const MEMBERS = new Map<number, object[]>([
        [1, [{ userId: 11 }, { groupName: 'ENTRA_ADMINS' }]],
        [2, [{ userId: 12 }]],
        [3, [{ userId: 13 }]],
        [4, [{ userId: 14 }, { userId: 15 }, { userId: 16 }]],
        [90, [{ userId: 50 }]],
        [91, [{ userId: 51 }]],
        [92, [{ userId: 52 }]],
    ]);
    /** Customer key per site id; 200 belongs to another customer on the same instance, 300 to one on instance 8. */
    const SITE_CUSTOMER = new Map([
        [100, 'TEL'],
        [200, 'OTHER'],
        [300, 'FAR'],
    ]);
    const CUSTOMERS = new Map<string, object>([
        ['TEL', CUSTOMER],
        ['OTHER', { key: 'OTHER', name: 'Other', beyondtrustInstanceId: 7 }],
        ['FAR', { key: 'FAR', name: 'Far', beyondtrustInstanceId: 8 }],
    ]);

    let queryBus: QueryBus;
    let execute: jest.Mock;

    beforeEach(() => {
        execute = jest.fn().mockImplementation((query: { pageNumber?: number }) => {
            const firstPage = <T>(items: T[] = []) => Promise.resolve(query.pageNumber === 1 ? items : []);

            if (query instanceof RetrieveSitesQuery) {
                return firstPage([
                    {
                        id: 100,
                        name: 'Hq',
                        key: 'k1',
                        customerKey: 'TEL',
                        siteSupportTeamMembers: [{ supportTeamName: 'Team_A' }, { supportTeamName: 'TEAM_A' }],
                    },
                ]);
            }
            if (query instanceof RetrieveGroupPoliciesQuery) return firstPage(GROUP_POLICIES);
            if (query instanceof RetrieveGroupPolicyMembersQuery) return firstPage(MEMBERS.get(query.groupPolicyId));
            if (query instanceof RetrieveSiteManagersByUserIdQuery) {
                return firstPage(
                    query.userId === 12
                        ? [
                              { id: 1, siteId: 100 },
                              { id: 2, siteId: 200 },
                          ]
                        : [],
                );
            }
            if (query instanceof RetrieveSiteAuditorsByUserIdQuery) {
                const rows = new Map([
                    [11, [{ id: 3, siteId: 100 }]],
                    [13, [{ id: 4, siteId: 300 }]],
                    [15, [{ id: 5, siteId: 400 }]],
                ]);

                return firstPage(rows.get(query.userId));
            }
            if (query instanceof RetrieveSiteSupportTeamMembersByUserIdQuery) {
                if (query.userId === 16) return Promise.reject(new Error('database unavailable'));

                return firstPage(query.userId === 13 ? [{ id: 6, siteId: 100, supportTeamName: 'TEAM_A' }] : []);
            }
            if (query instanceof RetrieveSiteByIdQuery) {
                const customerKey = SITE_CUSTOMER.get(query.siteId);

                return customerKey ? Promise.resolve({ customerKey }) : Promise.reject(new Error('site not found'));
            }
            if (query instanceof RetrieveCustomersQuery) return Promise.resolve([CUSTOMERS.get(query.key ?? '')]);

            return Promise.reject(new Error(`unexpected query ${(query as object).constructor.name}`));
        });
        queryBus = { execute: execute } as unknown as QueryBus;
    });

    function workflow(): CustomerExclusiveUsersWorkflow {
        return new CustomerExclusiveUsersWorkflow(appConfigService, queryBus, 'tx', CUSTOMER);
    }

    function membersQueriedFor(): number[] {
        return (execute.mock.calls as unknown[][])
            .map(([query]) => query)
            .filter(
                (query): query is RetrieveGroupPolicyMembersQuery => query instanceof RetrieveGroupPolicyMembersQuery,
            )
            .filter((query) => query.pageNumber === 1)
            .map((query) => query.groupPolicyId);
    }

    it('should derive the policy names in the same way as the ingestion', () => {
        expect(AdministratorGroupPolicyWorkflow.groupPolicyNameFor(appConfigService, 'Telemar')).toBe(
            'ADMINISTRATORS_TELEMAR',
        );
        expect(SiteAdministratorGroupPolicyWorkflow.groupPolicyNameFor(appConfigService, 'Telemar')).toBe(
            'ADMINISTRATORS_TELEMAR',
        );
        expect(ManagerGroupPolicyWorkflow.groupPolicyNameFor(appConfigService, 'Telemar', 'Hq', 'k1')).toBe(
            'MANAGERS_TELEMAR_HQ_K1',
        );
        expect(OperatorGroupPolicyWorkflow.groupPolicyNameFor(appConfigService, 'Telemar', 'Hq', 'k1')).toBe(
            'OPERATORS_TELEMAR_HQ_K1',
        );
        expect(SupportTeamGroupPolicyWorkflow.groupPolicyNameFor('Telemar', 'Team_A')).toBe('TELEMAR_TEAM_A');
    });

    it("should read the members of the customer's own policies only, found by their exact names", async () => {
        await workflow().find();

        expect(membersQueriedFor()).toEqual([1, 2, 3, 4]);
        expect(execute).toHaveBeenCalledWith(new RetrieveGroupPoliciesQuery('tx', 7, 100, 1, undefined, ['%TELEMAR%']));
        expect(execute).toHaveBeenCalledWith(new RetrieveSitesQuery('tx', 100, 1, undefined, undefined, ['TEL']));
    });

    it('should return users whose site roles on the instance all belong to the customer', async () => {
        const result = await workflow().find();

        // 11: auditor of the customer's site. 13: its other role is on another instance. 14: no site role.
        // 12 is not exclusive: it also manages a site of another customer on the same instance.
        expect(result.userIds).toEqual([11, 13, 14]);
    });

    it('should ignore identity provider groups and users of policies that only contain the customer name', async () => {
        await workflow().find();

        const checkedUserIds = (execute.mock.calls as unknown[][])
            .map(([query]) => query)
            .filter(
                (query): query is RetrieveSiteManagersByUserIdQuery =>
                    query instanceof RetrieveSiteManagersByUserIdQuery && query.pageNumber === 1,
            )
            .map((query) => query.userId);

        expect(checkedUserIds).toEqual([11, 12, 13, 14, 15, 16]);
    });

    it('should skip and report a user whose site or roles cannot be read instead of treating it as exclusive', async () => {
        const result = await workflow().find();

        expect(result.skipped).toEqual([
            { userId: 15, reason: 'the site or customer of site id(s) 400 could not be read' },
            { userId: 16, reason: expect.stringContaining('its site roles could not be read') as string },
        ]);
        expect(result.userIds).not.toContain(15);
        expect(result.userIds).not.toContain(16);
    });

    it("should decide nothing when the customer's sites cannot be read", async () => {
        execute.mockImplementation((query: unknown) =>
            query instanceof RetrieveSitesQuery
                ? Promise.reject(new Error('database unavailable'))
                : Promise.resolve([]),
        );

        await expect(workflow().find()).rejects.toThrow('database unavailable');
        expect(membersQueriedFor()).toEqual([]);
    });
});
