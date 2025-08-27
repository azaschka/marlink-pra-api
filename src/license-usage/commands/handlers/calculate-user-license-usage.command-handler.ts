import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Customer } from '../../../customer/models';
import { GroupPolicyMember } from '../../../group-policy-member/models';
import { RetrieveGroupPolicyMembersQuery } from '../../../group-policy-member/queries';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { PaginationUtility } from '../../../shared/utilities';
import { Site } from '../../../site/models';
import { User } from '../../../user/models';
import { LicenseUsage, UserLicenseUsageSourceData } from '../../models';
import { CalculateUserLicenseUsageCommand } from '../calculate-user-license-usage.command';

@CommandHandler(CalculateUserLicenseUsageCommand)
export class CalculateUserLicenseUsageCommandHandler implements ICommandHandler<CalculateUserLicenseUsageCommand> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async execute(command: CalculateUserLicenseUsageCommand): Promise<LicenseUsage> {
        const { totalLicenseUsage, licenseUsageSourceData } = await this.calculateCustomerAndSiteUsage(
            command.transactionId,
            command.customer,
            command.site,
        );

        return {
            totalLicenseUsage: totalLicenseUsage,
            licenseUsageSourceData: licenseUsageSourceData,
        };
    }

    private async calculateCustomerAndSiteUsage(transactionId: string, customer: Customer, site?: Site) {
        const licenseUsageSourceData: UserLicenseUsageSourceData[] = [];

        const associatedGroupPolicies = await this.getCustomerAssociatedGroupPolicies(transactionId, customer);

        for (const associatedGroupPolicy of associatedGroupPolicies) {
            if (site && !associatedGroupPolicy.name.toLowerCase().includes(site.name.toLowerCase())) {
                continue;
            }

            const groupPolicyMembers = await PaginationUtility.queryUntilLastPage<GroupPolicyMember>(
                (pageNumber: number) =>
                    this.queryBus.execute<RetrieveGroupPolicyMembersQuery, GroupPolicyMember[]>(
                        new RetrieveGroupPolicyMembersQuery(
                            transactionId,
                            CalculateUserLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            associatedGroupPolicy.id,
                        ),
                    ),
            );

            groupPolicyMembers.forEach((groupPolicyMember) => {
                licenseUsageSourceData.push({
                    groupPolicyId: associatedGroupPolicy.id,
                    groupPolicyName: associatedGroupPolicy.name,
                    groupPolicyLastSyncDate: associatedGroupPolicy.lastSyncDate,
                    groupPolicyMemberLastSyncDate: groupPolicyMember.lastSyncDate,
                    memberId: groupPolicyMember.memberId,
                    userId: groupPolicyMember.userId,
                    username: (groupPolicyMember as unknown as { user: User }).user.username,
                    userLastSyncDate: (groupPolicyMember as unknown as { user: User }).user.lastSyncDate,
                });
            });
        }

        // Calculate using the number of unique users
        const uniqueUserIds = new Set<number>();
        licenseUsageSourceData.forEach((data) => {
            uniqueUserIds.add(data.userId);
        });

        return {
            totalLicenseUsage: uniqueUserIds.size,
            licenseUsageSourceData: licenseUsageSourceData,
        };
    }

    private async getCustomerAssociatedGroupPolicies(transactionId: string, customer: Customer) {
        return await PaginationUtility.queryUntilLastPage<GroupPolicy>((pageNumber: number) =>
            this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
                new RetrieveGroupPoliciesQuery(
                    transactionId,
                    CalculateUserLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    undefined,
                    `%${customer.name.toUpperCase()}%`,
                ),
            ),
        );
    }
}
