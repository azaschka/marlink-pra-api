import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateGroupPolicyCommand, DeleteGroupPolicyCommand } from '../../group-policy/commands';
import { GroupPolicy } from '../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { BaseWorkflow } from '../../shared/workflows';

export class AdminGroupPolicyWorkflow implements BaseWorkflow<GroupPolicy> {
    private get groupPolicyName(): string {
        return `${this.appConfigService.customer.groupPolicy.adminPrefix}${this.customerName.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly customerName: string,
    ) {}

    public async getOrCreate(): Promise<GroupPolicy> {
        const groupPolicy = await this.get();

        if (groupPolicy) {
            return groupPolicy;
        }

        return await this.commandBus.execute<CreateGroupPolicyCommand, GroupPolicy>(
            new CreateGroupPolicyCommand(this.transactionId, this.groupPolicyName),
        );
    }

    public async delete(): Promise<void> {
        const groupPolicy = await this.get();

        if (!groupPolicy) {
            return;
        }

        await this.commandBus.execute<DeleteGroupPolicyCommand, void>(
            new DeleteGroupPolicyCommand(this.transactionId, groupPolicy.id),
        );
    }

    private async get(): Promise<GroupPolicy | null> {
        const groupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(this.transactionId, 1, 1, this.groupPolicyName),
        );

        return groupPolicies[0] ?? null;
    }
}
