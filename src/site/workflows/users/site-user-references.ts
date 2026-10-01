import { QueryBus } from '@nestjs/cqrs';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { PaginationUtility } from '../../../shared/utilities';
import { SiteSupportTeamAccessLevel, SiteUserType } from '../../enums';
import { Site, SiteAuditor, SiteManager, SiteSupportTeamMember } from '../../models';
import {
    RetrieveSiteAuditorsByUserIdQuery,
    RetrieveSiteByIdQuery,
    RetrieveSiteManagersByUserIdQuery,
    RetrieveSiteSupportTeamMembersByUserIdQuery,
} from '../../queries';

/** A site role a BeyondTrust account still holds after the role being removed is gone. */
export interface RemainingSiteRole {
    siteUserType: SiteUserType;
    siteId: number;
    customerName: string;
    isAdminOperator?: boolean;
    supportTeamName?: string;
    supportTeamAccessLevel?: SiteSupportTeamAccessLevel;
}

/** The role row that is being removed; it must not count as a remaining reference to itself. */
export interface RemovedSiteRole {
    siteUserType: SiteUserType;
    id?: number;
    siteId?: number;
}

/**
 * Group policies a site role needs, as keys that are comparable across sites and roles.
 *
 * The same BeyondTrust account can hold several site roles: the console sends the email as username for every
 * role, and a non-local account is matched by email. Some group policies are shared between roles (the site
 * OPERATORS policy, FULL_ACCESS), between sites (the global *_ACCESS policies) or between sites of one customer
 * (ADMINISTRATORS, support team policies). A membership may only be removed when no remaining role of the account
 * needs it (decision 2026-10-01: PRA-managed memberships, counted across sites).
 */
export abstract class SiteGroupPolicyKeys {
    public static readonly MANAGER_ACCESS = 'MANAGER_ACCESS';
    public static readonly ADMINISTRATOR_ACCESS = 'ADMINISTRATOR_ACCESS';
    public static readonly ADMIN_OPERATOR_ACCESS = 'ADMIN_OPERATOR_ACCESS';
    public static readonly FULL_ACCESS = 'FULL_ACCESS';
    public static readonly LIMITED_ACCESS = 'LIMITED_ACCESS';

    public static siteManagers(siteId: number | undefined): string {
        return `MANAGERS@site:${siteId ?? 'unknown'}`;
    }

    public static siteOperators(siteId: number | undefined): string {
        return `OPERATORS@site:${siteId ?? 'unknown'}`;
    }

    public static customerAdministrators(customerName: string): string {
        return `ADMINISTRATORS@customer:${customerName.toUpperCase()}`;
    }

    public static supportTeam(customerName: string, supportTeamName: string): string {
        return `TEAM@customer:${customerName.toUpperCase()}:${supportTeamName.toUpperCase()}`;
    }

    public static accessForSupportTeamMember(accessLevel: SiteSupportTeamAccessLevel | undefined): string {
        return accessLevel === SiteSupportTeamAccessLevel.Full
            ? SiteGroupPolicyKeys.FULL_ACCESS
            : SiteGroupPolicyKeys.LIMITED_ACCESS;
    }

    /** Keys of every group policy the given remaining role needs. */
    public static requiredBy(role: RemainingSiteRole): string[] {
        switch (role.siteUserType) {
            case SiteUserType.SiteManager:
                return [SiteGroupPolicyKeys.siteManagers(role.siteId), SiteGroupPolicyKeys.MANAGER_ACCESS];
            case SiteUserType.SiteAuditor:
                return role.isAdminOperator
                    ? [
                          SiteGroupPolicyKeys.customerAdministrators(role.customerName),
                          SiteGroupPolicyKeys.ADMIN_OPERATOR_ACCESS,
                          SiteGroupPolicyKeys.siteOperators(role.siteId),
                          SiteGroupPolicyKeys.FULL_ACCESS,
                      ]
                    : [
                          SiteGroupPolicyKeys.customerAdministrators(role.customerName),
                          SiteGroupPolicyKeys.ADMINISTRATOR_ACCESS,
                      ];
            case SiteUserType.SiteSupportTeamMember:
                return [
                    SiteGroupPolicyKeys.supportTeam(role.customerName, role.supportTeamName ?? ''),
                    SiteGroupPolicyKeys.siteOperators(role.siteId),
                    SiteGroupPolicyKeys.accessForSupportTeamMember(role.supportTeamAccessLevel),
                ];
            default:
                return [];
        }
    }

    /**
     * The group policy ids of the removed role that no remaining role needs.
     *
     * @param candidates key and group policy id of every policy the removed role was given
     */
    public static removable(
        candidates: [key: string, groupPolicyId: number][],
        remaining: RemainingSiteRole[],
    ): number[] {
        const required = new Set(remaining.flatMap((role) => SiteGroupPolicyKeys.requiredBy(role)));

        return candidates.filter(([key]) => !required.has(key)).map(([, groupPolicyId]) => groupPolicyId);
    }
}

/**
 * Finds the site roles a BeyondTrust account holds, across all three site user tables and all sites, limited to
 * sites whose customer lives on the same BeyondTrust instance (user ids are only unique per instance).
 */
export class SiteUserReferences {
    private static readonly MAX_PAGE_SIZE = 100;

    private readonly sites = new Map<number, Promise<Site | null>>();
    private readonly customers = new Map<string, Promise<Customer | null>>();

    constructor(
        private readonly queryBus: QueryBus,
        private readonly transactionId: string,
        private readonly beyondtrustInstanceId: number,
    ) {}

    /**
     * @param removed the role row being removed
     * @param removedTogether rows removed in the same operation (all rows of a deleted site, every row that left the
     *        ingestion data in one run); they are still stored while the removal runs but must not count as remaining
     */
    public async remainingRoles(
        userId: number,
        removed: RemovedSiteRole,
        removedTogether: RemovedSiteRole[] = [],
    ): Promise<RemainingSiteRole[]> {
        const [siteManagers, siteAuditors, siteSupportTeamMembers] = await Promise.all([
            this.queryAll<SiteManager>((pageNumber) =>
                this.queryBus.execute<RetrieveSiteManagersByUserIdQuery, SiteManager[]>(
                    new RetrieveSiteManagersByUserIdQuery(
                        this.transactionId,
                        SiteUserReferences.MAX_PAGE_SIZE,
                        pageNumber,
                        userId,
                    ),
                ),
            ),
            this.queryAll<SiteAuditor>((pageNumber) =>
                this.queryBus.execute<RetrieveSiteAuditorsByUserIdQuery, SiteAuditor[]>(
                    new RetrieveSiteAuditorsByUserIdQuery(
                        this.transactionId,
                        SiteUserReferences.MAX_PAGE_SIZE,
                        pageNumber,
                        userId,
                    ),
                ),
            ),
            this.queryAll<SiteSupportTeamMember>((pageNumber) =>
                this.queryBus.execute<RetrieveSiteSupportTeamMembersByUserIdQuery, SiteSupportTeamMember[]>(
                    new RetrieveSiteSupportTeamMembersByUserIdQuery(
                        this.transactionId,
                        SiteUserReferences.MAX_PAGE_SIZE,
                        pageNumber,
                        userId,
                    ),
                ),
            ),
        ]);

        const rows: { siteUserType: SiteUserType; row: SiteManager | SiteAuditor | SiteSupportTeamMember }[] = [
            ...siteManagers.map((row) => ({ siteUserType: SiteUserType.SiteManager, row })),
            ...siteAuditors.map((row) => ({ siteUserType: SiteUserType.SiteAuditor, row })),
            ...siteSupportTeamMembers.map((row) => ({ siteUserType: SiteUserType.SiteSupportTeamMember, row })),
        ];

        const remaining: RemainingSiteRole[] = [];

        for (const { siteUserType, row } of rows) {
            if (
                SiteUserReferences.isRemovedRow(siteUserType, row, removed) ||
                removedTogether.some(
                    (other) => other.id !== undefined && SiteUserReferences.isRemovedRow(siteUserType, row, other),
                )
            ) {
                continue;
            }

            const customer = await this.customerOfSite(row.siteId);

            // A row whose site or customer cannot be resolved still counts: keeping a membership too long is
            // recoverable, removing one that another site needs is not.
            if (customer && customer.beyondtrustInstanceId !== this.beyondtrustInstanceId) {
                continue;
            }

            remaining.push({
                siteUserType,
                siteId: row.siteId,
                customerName: customer?.name ?? '',
                isAdminOperator: (row as SiteAuditor).isAdminOperator,
                supportTeamName: (row as SiteSupportTeamMember).supportTeamName,
                supportTeamAccessLevel: (row as SiteSupportTeamMember).supportTeamAccessLevel,
            });
        }

        return remaining;
    }

    /**
     * The removed row is identified by its id; without an id, by its site. Without either nothing is excluded, so
     * the removed role counts as remaining and nothing is removed or deleted (fail-safe).
     */
    private static isRemovedRow(
        siteUserType: SiteUserType,
        row: { id: number; siteId: number },
        removed: RemovedSiteRole,
    ): boolean {
        if (siteUserType !== removed.siteUserType) {
            return false;
        }

        if (removed.id !== undefined) {
            return row.id === removed.id;
        }

        return removed.siteId !== undefined && row.siteId === removed.siteId;
    }

    private async queryAll<T>(query: (pageNumber: number) => Promise<T[]>): Promise<T[]> {
        return await PaginationUtility.queryUntilLastPage<T>(query);
    }

    private async customerOfSite(siteId: number): Promise<Customer | null> {
        if (!this.sites.has(siteId)) {
            this.sites.set(
                siteId,
                this.queryBus
                    .execute<RetrieveSiteByIdQuery, Site>(new RetrieveSiteByIdQuery(this.transactionId, siteId))
                    .catch(() => null),
            );
        }

        const site = await this.sites.get(siteId);

        if (!site) {
            return null;
        }

        if (!this.customers.has(site.customerKey)) {
            this.customers.set(
                site.customerKey,
                this.queryBus
                    .execute<RetrieveCustomersQuery, Customer[]>(
                        new RetrieveCustomersQuery(this.transactionId, 1, 1, site.customerKey),
                    )
                    .then((customers) => customers[0] ?? null)
                    .catch(() => null),
            );
        }

        return (await this.customers.get(site.customerKey)) ?? null;
    }
}
