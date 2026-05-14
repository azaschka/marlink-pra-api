/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DeleteGroupPolicyCommand } from '../../group-policy/commands';
import { GroupPolicy } from '../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { DeleteJumpGroupCommand } from '../../jump-group/commands';
import { JumpGroup } from '../../jump-group/models';
import { RetrieveJumpGroupsQuery } from '../../jump-group/queries';
import { DeleteJumpClientInstallerCommand } from '../../jump-client/commands';
import { JumpClientInstaller } from '../../jump-client/models';
import { RetrieveJumpClientInstallersQuery } from '../../jump-client/queries';

/**
 * Cleans up all Support Team artifacts that belong to a customer:
 *  - Support Team Jump Groups   (named `{customerName}_{supportTeamName}`)
 *  - Jump Client Installers     (linked to those Jump Groups via jumpGroupId)
 *  - Support Team Group Policies (named `{CUSTOMER_NAME}_{SUPPORT_TEAM_NAME}`)
 *
 * This workflow is intentionally separate from the per-site SiteSupportTeamMemberWorkflow
 * because the Support Team Jump Group and Group Policy are shared across all sites of a
 * customer and should only be removed when the entire customer is deleted.
 */
export class SupportTeamArtifactsWorkflow {
    private static readonly MAX_PAGE_SIZE = 100;

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly customerName: string,
        private readonly customerBeyondTrustInstanceId: number,
    ) {}

    public async delete(): Promise<void> {
        await this.deleteJumpGroupsWithInstallers();
        await this.deleteGroupPolicies();
    }

    // ─── Jump Groups & Installers ─────────────────────────────────────────────

    private async deleteJumpGroupsWithInstallers(): Promise<void> {
        const jumpGroups = await this.getAllCustomerJumpGroups();

        console.log(
            `[${this.transactionId}] Found ${jumpGroups.length} support team jump group(s) to clean up for customer "${this.customerName}"`,
        );

        for (const jumpGroup of jumpGroups) {
            await this.deleteJumpClientInstallersForJumpGroup(jumpGroup);
            await this.deleteJumpGroup(jumpGroup);
        }
    }

    private async getAllCustomerJumpGroups(): Promise<JumpGroup[]> {
        // Jump group names follow the pattern: {customerName}_{supportTeamName}
        const pattern = `${this.customerName}_%`;

        return await this.queryBus.execute<RetrieveJumpGroupsQuery, JumpGroup[]>(
            new RetrieveJumpGroupsQuery(
                this.transactionId,
                this.customerBeyondTrustInstanceId,
                SupportTeamArtifactsWorkflow.MAX_PAGE_SIZE,
                1,
                undefined, // name (exact match) – not used; pattern-match instead
                undefined, // codeName
                [pattern],
            ),
        );
    }

    private async deleteJumpClientInstallersForJumpGroup(jumpGroup: JumpGroup): Promise<void> {
        const installers = await this.queryBus.execute<RetrieveJumpClientInstallersQuery, JumpClientInstaller[]>(
            new RetrieveJumpClientInstallersQuery(
                this.transactionId,
                this.customerBeyondTrustInstanceId,
                SupportTeamArtifactsWorkflow.MAX_PAGE_SIZE,
                1,
                undefined, // name
                undefined, // hostname
                undefined, // fqdn
                undefined, // tag
                [jumpGroup.id], // jumpGroupIds
            ),
        );

        console.log(
            `[${this.transactionId}] Deleting ${installers.length} jump client installer(s) from jump group "${jumpGroup.name}" (${jumpGroup.id})`,
        );

        for (const installer of installers) {
            try {
                await this.commandBus.execute<DeleteJumpClientInstallerCommand, void>(
                    new DeleteJumpClientInstallerCommand(
                        this.transactionId,
                        this.customerBeyondTrustInstanceId,
                        installer.id,
                    ),
                );
            } catch (error) {
                const statusCode =
                    (error as any)?.status ??
                    (error as any)?.response?.statusCode ??
                    (error as any)?.response?.message?.statusCode;

                if (statusCode === 404) {
                    console.log(
                        `[${this.transactionId}] Jump client installer ${installer.id} not found (404) – skipping`,
                    );
                    continue;
                }

                console.error(`[${this.transactionId}] Failed to delete jump client installer ${installer.id}:`, error);
            }
        }
    }

    private async deleteJumpGroup(jumpGroup: JumpGroup): Promise<void> {
        try {
            console.log(
                `[${this.transactionId}] Deleting support team jump group "${jumpGroup.name}" (${jumpGroup.id})`,
            );

            await this.commandBus.execute<DeleteJumpGroupCommand, void>(
                new DeleteJumpGroupCommand(this.transactionId, this.customerBeyondTrustInstanceId, jumpGroup.id),
            );
        } catch (error) {
            const statusCode =
                (error as any)?.status ??
                (error as any)?.response?.statusCode ??
                (error as any)?.response?.message?.statusCode;

            if (statusCode === 404) {
                console.log(
                    `[${this.transactionId}] Jump group "${jumpGroup.name}" (${jumpGroup.id}) not found (404) – skipping`,
                );
                return;
            }

            throw error;
        }
    }

    // ─── Group Policies ───────────────────────────────────────────────────────

    private async deleteGroupPolicies(): Promise<void> {
        const groupPolicies = await this.getAllCustomerGroupPolicies();

        console.log(
            `[${this.transactionId}] Found ${groupPolicies.length} support team group policy/policies to clean up for customer "${this.customerName}"`,
        );

        for (const groupPolicy of groupPolicies) {
            await this.deleteGroupPolicy(groupPolicy);
        }
    }

    private async getAllCustomerGroupPolicies(): Promise<GroupPolicy[]> {
        // Group policy names follow the pattern: {CUSTOMER_NAME}_{SUPPORT_TEAM_NAME} (both uppercased)
        const pattern = `${this.customerName.toUpperCase()}_%`;

        return await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(
                this.transactionId,
                this.customerBeyondTrustInstanceId,
                SupportTeamArtifactsWorkflow.MAX_PAGE_SIZE,
                1,
                undefined, // name (exact match) – not used; pattern-match instead
                [pattern],
            ),
        );
    }

    private async deleteGroupPolicy(groupPolicy: GroupPolicy): Promise<void> {
        try {
            console.log(
                `[${this.transactionId}] Deleting support team group policy "${groupPolicy.name}" (${groupPolicy.id})`,
            );

            await this.commandBus.execute<DeleteGroupPolicyCommand, void>(
                new DeleteGroupPolicyCommand(this.transactionId, this.customerBeyondTrustInstanceId, groupPolicy.id),
            );
        } catch (error) {
            const statusCode =
                (error as any)?.status ??
                (error as any)?.response?.statusCode ??
                (error as any)?.response?.message?.statusCode;

            if (statusCode === 404) {
                console.log(
                    `[${this.transactionId}] Group policy "${groupPolicy.name}" (${groupPolicy.id}) not found (404) – skipping`,
                );
                return;
            }

            throw error;
        }
    }
}
