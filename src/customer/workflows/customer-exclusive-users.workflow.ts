import { QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { GroupPolicy } from '../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { GroupPolicyMember } from '../../group-policy-member/models';
import { RetrieveGroupPolicyMembersQuery } from '../../group-policy-member/queries/retrieve-group-policy-members.query';
import { ErrorProcessorUtility, PaginationUtility } from '../../shared/utilities';
import { Site } from '../../site/models';
import { RetrieveSitesQuery } from '../../site/queries';
import {
    AdministratorGroupPolicyWorkflow as SiteAdministratorGroupPolicyWorkflow,
    ManagerGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
    SupportTeamGroupPolicyWorkflow,
} from '../../site/workflows/group-policies';
import { RemainingSiteRole, SiteUserReferences } from '../../site/workflows/users/site-user-references';
import { Customer } from '../models';
import { AdministratorGroupPolicyWorkflow } from './administrator-group-policy.workflow';

/** A candidate whose login is left unchanged because its site roles could not be read completely. */
export interface SkippedCustomerUser {
    userId: number;
    reason: string;
}

export interface CustomerExclusiveUsers {
    /** BeyondTrust user ids whose login follows the status of the customer. */
    userIds: number[];
    skipped: SkippedCustomerUser[];
}

/**
 * Finds the BeyondTrust users whose login follows the status of a customer when it is deactivated or reactivated
 * (EXT-27): direct user members of the customer's own group policies whose site roles on the customer's
 * BeyondTrust instance all belong to that customer. Local and external users are treated alike.
 *
 * - The customer's policies are recognised by their exact names, derived from the customer and its sites in the
 *   same way the ingestion names them. A substring match on the customer name also picks up policies of customers
 *   with a longer name and policies such as GP_<BU>_SAML_DEFAULT, whose members have no site role and would look
 *   exclusive.
 * - Members that are identity provider groups carry no user id and are ignored.
 * - Site roles count on the customer's instance only, because user ids are unique per instance.
 * - A user whose site roles cannot be read completely is skipped and reported, never changed. Before EXT-27 an
 *   unreadable site was left out, so a failed lookup made the user look exclusive.
 *
 * A direct member of the customer's policies without any site role still counts as exclusive, as before.
 */
export class CustomerExclusiveUsersWorkflow {
    private static readonly MAX_PAGE_SIZE = 100;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly transactionId: string,
        private readonly customer: Customer,
    ) {}

    /**
     * @throws when the customer's sites, group policies or their members cannot be read; nothing is decided then
     */
    public async find(): Promise<CustomerExclusiveUsers> {
        const groupPolicies = await this.customerGroupPolicies();
        const candidateUserIds = await this.directUserMembers(groupPolicies);
        const siteUserReferences = new SiteUserReferences(
            this.queryBus,
            this.transactionId,
            this.customer.beyondtrustInstanceId,
        );
        const result: CustomerExclusiveUsers = { userIds: [], skipped: [] };

        for (const userId of candidateUserIds) {
            let roles: RemainingSiteRole[];

            try {
                roles = await siteUserReferences.roles(userId);
            } catch (error) {
                result.skipped.push({
                    userId: userId,
                    reason: `its site roles could not be read: ${ErrorProcessorUtility.stringify(error)}`,
                });

                continue;
            }

            const unreadableSiteIds = roles.filter((role) => role.customerKey === undefined).map((role) => role.siteId);

            if (unreadableSiteIds.length > 0) {
                result.skipped.push({
                    userId: userId,
                    reason: `the site or customer of site id(s) ${[...new Set(unreadableSiteIds)].join(', ')} could not be read`,
                });

                continue;
            }

            if (roles.every((role) => role.customerKey === this.customer.key)) {
                result.userIds.push(userId);
            }
        }

        return result;
    }

    private async customerGroupPolicies(): Promise<GroupPolicy[]> {
        const names = await this.customerGroupPolicyNames();
        const matches = await PaginationUtility.queryUntilLastPage<GroupPolicy>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
                new RetrieveGroupPoliciesQuery(
                    this.transactionId,
                    this.customer.beyondtrustInstanceId,
                    CustomerExclusiveUsersWorkflow.MAX_PAGE_SIZE,
                    pageNumber,
                    undefined,
                    [`%${this.customer.name.toUpperCase()}%`],
                ),
            ),
        );

        // The substring query only narrows the search; the exact names decide.
        return matches.filter((groupPolicy) => names.has(groupPolicy.name.toUpperCase()));
    }

    /** Upper-case names of the customer-level policies and of the policies of every site of the customer. */
    private async customerGroupPolicyNames(): Promise<Set<string>> {
        const customerName = this.customer.name;
        const sites = await PaginationUtility.queryUntilLastPage<Site>((pageNumber) =>
            this.queryBus.execute<RetrieveSitesQuery, Site[]>(
                new RetrieveSitesQuery(
                    this.transactionId,
                    CustomerExclusiveUsersWorkflow.MAX_PAGE_SIZE,
                    pageNumber,
                    undefined,
                    undefined,
                    [this.customer.key],
                ),
            ),
        );
        const names = [
            AdministratorGroupPolicyWorkflow.groupPolicyNameFor(this.appConfigService, customerName),
            SiteAdministratorGroupPolicyWorkflow.groupPolicyNameFor(this.appConfigService, customerName),
        ];

        for (const site of sites) {
            names.push(
                ManagerGroupPolicyWorkflow.groupPolicyNameFor(this.appConfigService, customerName, site.name, site.key),
                OperatorGroupPolicyWorkflow.groupPolicyNameFor(
                    this.appConfigService,
                    customerName,
                    site.name,
                    site.key,
                ),
                ...site.siteSupportTeamMembers.map((member) =>
                    SupportTeamGroupPolicyWorkflow.groupPolicyNameFor(customerName, member.supportTeamName),
                ),
            );
        }

        return new Set(names.map((name) => name.toUpperCase()));
    }

    private async directUserMembers(groupPolicies: GroupPolicy[]): Promise<number[]> {
        const userIds = new Set<number>();

        for (const groupPolicy of groupPolicies) {
            const members = await PaginationUtility.queryUntilLastPage<GroupPolicyMember>((pageNumber) =>
                this.queryBus.execute<RetrieveGroupPolicyMembersQuery, GroupPolicyMember[]>(
                    new RetrieveGroupPolicyMembersQuery(
                        this.transactionId,
                        this.customer.beyondtrustInstanceId,
                        CustomerExclusiveUsersWorkflow.MAX_PAGE_SIZE,
                        pageNumber,
                        groupPolicy.id,
                    ),
                ),
            );

            for (const member of members) {
                // Identity provider groups are members without a user id.
                if (member.userId !== undefined && member.userId !== null) {
                    userIds.add(member.userId);
                }
            }
        }

        return [...userIds];
    }
}
