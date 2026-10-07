/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateGroupPolicyCommand, DeleteGroupPolicyCommand } from '../../group-policy/commands';
import { GroupPolicy } from '../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { GroupPolicyMember } from '../../group-policy-member/models';
import { RetrieveGroupPolicyMembersQuery } from '../../group-policy-member/queries/retrieve-group-policy-members.query';
import { PaginationUtility } from '../../shared/utilities';
import { BaseWorkflow } from '../../shared/workflows';
import { SiteUserReferences } from '../../site/workflows/users/site-user-references';
import { DeleteUserCommand } from '../../user/commands';

export class AdministratorGroupPolicyWorkflow implements BaseWorkflow<GroupPolicy> {
    private static readonly MAX_MEMBERS_RETRIEVED_PER_PAGE = 100;

    private get groupPolicyName(): string {
        return `${this.appConfigService.customer.groupPolicy.administratorPrefix}${this.customerName.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly customerName: string,
        private readonly customerBeyondTrustInstanceId: number,
    ) {}

    public async getOrCreate(): Promise<GroupPolicy> {
        const groupPolicy = await this.get();

        if (groupPolicy) {
            return groupPolicy;
        }

        return await this.commandBus.execute<CreateGroupPolicyCommand, GroupPolicy>(
            new CreateGroupPolicyCommand(this.transactionId, this.customerBeyondTrustInstanceId, this.groupPolicyName),
        );
    }

    public async delete(): Promise<void> {
        try {
            const groupPolicy = await this.get();

            if (!groupPolicy) {
                return;
            }

            await this.deleteOrphanedUsers(groupPolicy.id);

            await this.commandBus.execute<DeleteGroupPolicyCommand, void>(
                new DeleteGroupPolicyCommand(this.transactionId, this.customerBeyondTrustInstanceId, groupPolicy.id),
            );
        } catch (error) {
            const statusCode =
                (error as any)?.status ??
                (error as any)?.response?.statusCode ??
                (error as any)?.response?.message?.statusCode;

            if (statusCode === 404) {
                console.log(`[${this.transactionId}] External resource not found (404) - skipping cleanup`);
                return;
            }

            throw error;
        }
    }

    /**
     * Deletes the BeyondTrust accounts, local and non-local, that are direct members of the customer's
     * administrators group policy and hold no site role any more (EXT-19).
     *
     * An account is kept while it is a site manager, site auditor or site support team member of any site on the
     * same BeyondTrust instance. Looking at auditor rows only, as before, deleted accounts that were still in use
     * in another role. Members that are identity provider groups carry no user id and are left alone.
     */
    private async deleteOrphanedUsers(groupPolicyId: number): Promise<void> {
        const members = await PaginationUtility.queryUntilLastPage<GroupPolicyMember>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyMembersQuery, GroupPolicyMember[]>(
                new RetrieveGroupPolicyMembersQuery(
                    this.transactionId,
                    this.customerBeyondTrustInstanceId,
                    AdministratorGroupPolicyWorkflow.MAX_MEMBERS_RETRIEVED_PER_PAGE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );
        const siteUserReferences = new SiteUserReferences(
            this.queryBus,
            this.transactionId,
            this.customerBeyondTrustInstanceId,
        );

        for (const member of members) {
            if (member.userId === undefined || member.userId === null) {
                continue;
            }

            try {
                const siteRoles = await siteUserReferences.roles(member.userId);

                if (siteRoles.length > 0) {
                    console.log(
                        `[${this.transactionId}] User ${member.userId} still holds ${siteRoles.length} site role(s) - skipping deletion`,
                    );
                    continue;
                }

                console.log(`[${this.transactionId}] Deleting orphaned BT user ${member.userId} from customer cleanup`);
                await this.commandBus.execute<DeleteUserCommand, void>(
                    new DeleteUserCommand(this.transactionId, this.customerBeyondTrustInstanceId, member.userId),
                );
            } catch (error) {
                const statusCode =
                    (error as any)?.status ??
                    (error as any)?.response?.statusCode ??
                    (error as any)?.response?.message?.statusCode;

                if (statusCode === 404) {
                    console.log(`[${this.transactionId}] BT user ${member.userId} not found (404) - skipping`);
                    continue;
                }

                console.error(`[${this.transactionId}] Failed to delete BT user ${member.userId}:`, error);
            }
        }
    }

    private async get(): Promise<GroupPolicy | null> {
        const groupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(
                this.transactionId,
                this.customerBeyondTrustInstanceId,
                1,
                1,
                this.groupPolicyName,
            ),
        );

        return groupPolicies[0] ?? null;
    }
}
