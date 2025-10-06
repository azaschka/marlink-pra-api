import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateGroupPolicyCommand, DeleteGroupPolicyCommand } from '../../group-policy/commands';
import { GroupPolicy } from '../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { BaseWorkflow } from '../../shared/workflows';

export class AdministratorGroupPolicyWorkflow implements BaseWorkflow<GroupPolicy> {
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
        const groupPolicy = await this.get();

        if (!groupPolicy) {
            return;
        }

        await this.commandBus.execute<DeleteGroupPolicyCommand, void>(
            new DeleteGroupPolicyCommand(this.transactionId, this.customerBeyondTrustInstanceId, groupPolicy.id),
        );
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
