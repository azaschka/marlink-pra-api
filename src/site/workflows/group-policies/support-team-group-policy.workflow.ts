import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateGroupPolicyCommand, DeleteGroupPolicyCommand } from '../../../group-policy/commands';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { BaseWorkflow } from '../../../shared/workflows';
import { PartialSiteSupportTeamMember } from '../../models';

export class SupportTeamGroupPolicyWorkflow implements BaseWorkflow<GroupPolicy> {
    /** Name of the policy of a support team, shared by the sites of a customer; also used to recognise it (EXT-27). */
    public static groupPolicyNameFor(customerName: string, supportTeamName: string): string {
        return `${customerName.toUpperCase()}_${supportTeamName.toUpperCase()}`;
    }

    private get groupPolicyName(): string {
        return SupportTeamGroupPolicyWorkflow.groupPolicyNameFor(
            this.customerName,
            this.siteSupportTeamMember.supportTeamName,
        );
    }

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteSupportTeamMember: PartialSiteSupportTeamMember,
        private readonly customerName: string,
        private readonly customerBeyondtrustInstanceId: number,
    ) {}

    public async getOrCreate(): Promise<GroupPolicy> {
        const groupPolicy = await this.get();

        if (groupPolicy) {
            return groupPolicy;
        }

        return await this.commandBus.execute<CreateGroupPolicyCommand, GroupPolicy>(
            new CreateGroupPolicyCommand(this.transactionId, this.customerBeyondtrustInstanceId, this.groupPolicyName),
        );
    }

    public async delete(): Promise<void> {
        const groupPolicy = await this.get();

        if (!groupPolicy) {
            return;
        }

        await this.commandBus.execute<DeleteGroupPolicyCommand, void>(
            new DeleteGroupPolicyCommand(this.transactionId, this.customerBeyondtrustInstanceId, groupPolicy.id),
        );
    }

    private async get(): Promise<GroupPolicy | null> {
        const groupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                1,
                1,
                this.groupPolicyName,
            ),
        );

        return groupPolicies[0] ?? null;
    }
}
