import { QueryBus } from '@nestjs/cqrs';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteSupportTeamAccessLevel, SiteUserType } from '../../enums';
import {
    RetrieveSiteAuditorsByUserIdQuery,
    RetrieveSiteByIdQuery,
    RetrieveSiteManagersByUserIdQuery,
    RetrieveSiteSupportTeamMembersByUserIdQuery,
} from '../../queries';
import { RemainingSiteRole, SiteGroupPolicyKeys, SiteUserReferences } from './site-user-references';

describe('SiteGroupPolicyKeys.removable (EXT-03)', () => {
    const auditorOperatorOnSite10: RemainingSiteRole = {
        siteUserType: SiteUserType.SiteAuditor,
        siteId: 10,
        customerName: 'acme',
        isAdminOperator: true,
    };

    it('should keep policies that a remaining role of the same account needs', () => {
        const removable = SiteGroupPolicyKeys.removable(
            [
                [SiteGroupPolicyKeys.supportTeam('ACME', 'TEAM_A'), 1],
                [SiteGroupPolicyKeys.siteOperators(10), 2],
                [SiteGroupPolicyKeys.FULL_ACCESS, 3],
            ],
            [auditorOperatorOnSite10],
        );

        expect(removable).toEqual([1]);
    });

    it('should remove everything when no role remains', () => {
        expect(
            SiteGroupPolicyKeys.removable(
                [
                    [SiteGroupPolicyKeys.siteManagers(10), 1],
                    [SiteGroupPolicyKeys.MANAGER_ACCESS, 2],
                ],
                [],
            ),
        ).toEqual([1, 2]);
    });

    it('should keep the global manager policy while the account manages another site', () => {
        expect(
            SiteGroupPolicyKeys.removable(
                [
                    [SiteGroupPolicyKeys.siteManagers(10), 1],
                    [SiteGroupPolicyKeys.MANAGER_ACCESS, 2],
                ],
                [{ siteUserType: SiteUserType.SiteManager, siteId: 11, customerName: 'other' }],
            ),
        ).toEqual([1]);
    });

    it('should remove the customer administrators policy when the account audits only another customer', () => {
        expect(
            SiteGroupPolicyKeys.removable(
                [
                    [SiteGroupPolicyKeys.customerAdministrators('acme'), 1],
                    [SiteGroupPolicyKeys.ADMINISTRATOR_ACCESS, 2],
                ],
                [{ siteUserType: SiteUserType.SiteAuditor, siteId: 20, customerName: 'other', isAdminOperator: false }],
            ),
        ).toEqual([1]);
    });

    it('should distinguish limited and full access of support team members', () => {
        expect(
            SiteGroupPolicyKeys.removable(
                [[SiteGroupPolicyKeys.FULL_ACCESS, 3]],
                [
                    {
                        siteUserType: SiteUserType.SiteSupportTeamMember,
                        siteId: 11,
                        customerName: 'acme',
                        supportTeamName: 'TEAM_B',
                        supportTeamAccessLevel: SiteSupportTeamAccessLevel.Limited,
                    },
                ],
            ),
        ).toEqual([3]);
    });
});

describe('SiteUserReferences (EXT-03)', () => {
    const SITES: Record<string, { customerKey: string }> = { s10: { customerKey: 'C1' }, s11: { customerKey: 'C2' } };
    const CUSTOMERS: Record<string, { name: string; beyondtrustInstanceId: number }> = {
        C1: { name: 'ACME', beyondtrustInstanceId: 1 },
        C2: { name: 'OTHER_TENANT', beyondtrustInstanceId: 2 },
    };

    function mockQueryBus(rows: { managers?: object[]; auditors?: object[]; members?: object[] }): QueryBus {
        return {
            execute: jest.fn().mockImplementation((query: { pageNumber?: number }) => {
                const firstPage = <T>(items: T[]) => Promise.resolve(query.pageNumber === 1 ? items : []);
                if (query instanceof RetrieveSiteManagersByUserIdQuery) return firstPage(rows.managers ?? []);
                if (query instanceof RetrieveSiteAuditorsByUserIdQuery) return firstPage(rows.auditors ?? []);
                if (query instanceof RetrieveSiteSupportTeamMembersByUserIdQuery) return firstPage(rows.members ?? []);
                if (query instanceof RetrieveSiteByIdQuery) {
                    const site = SITES[`s${query.siteId}`];
                    return site ? Promise.resolve(site) : Promise.reject(new Error('not found'));
                }
                if (query instanceof RetrieveCustomersQuery) {
                    const customer = CUSTOMERS[query.key ?? ''];
                    return Promise.resolve(customer ? [customer] : []);
                }
                return Promise.resolve([]);
            }),
        } as unknown as QueryBus;
    }

    it('should exclude the removed row and keep the other roles of the account', async () => {
        const queryBus = mockQueryBus({
            managers: [{ id: 1, siteId: 10, userId: 7 }],
            auditors: [{ id: 2, siteId: 10, userId: 7, isAdminOperator: false }],
        });

        const remaining = await new SiteUserReferences(queryBus, 'tx', 1).remainingRoles(7, {
            siteUserType: SiteUserType.SiteAuditor,
            id: 2,
            siteId: 10,
        });

        expect(remaining).toEqual([
            expect.objectContaining({ siteUserType: SiteUserType.SiteManager, siteId: 10, customerName: 'ACME' }),
        ]);
    });

    it('should ignore rows of sites on another BeyondTrust instance, because user ids are only unique per instance', async () => {
        const queryBus = mockQueryBus({ managers: [{ id: 1, siteId: 11, userId: 7 }] });

        const remaining = await new SiteUserReferences(queryBus, 'tx', 1).remainingRoles(7, {
            siteUserType: SiteUserType.SiteAuditor,
            id: 99,
        });

        expect(remaining).toEqual([]);
    });

    it('should keep a row whose site cannot be resolved (fail-safe)', async () => {
        const queryBus = mockQueryBus({ managers: [{ id: 1, siteId: 404, userId: 7 }] });

        const remaining = await new SiteUserReferences(queryBus, 'tx', 1).remainingRoles(7, {
            siteUserType: SiteUserType.SiteAuditor,
            id: 99,
        });

        expect(remaining.length).toBe(1);
    });

    it('should exclude nothing when the removed row has neither id nor site (fail-safe)', async () => {
        const queryBus = mockQueryBus({ auditors: [{ id: 2, siteId: 10, userId: 7, isAdminOperator: false }] });

        const remaining = await new SiteUserReferences(queryBus, 'tx', 1).remainingRoles(7, {
            siteUserType: SiteUserType.SiteAuditor,
        });

        expect(remaining.length).toBe(1);
    });
});
