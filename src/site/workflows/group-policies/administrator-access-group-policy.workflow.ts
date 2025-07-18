import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { CreateGroupPolicyCommand } from '../../../group-policy/commands';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { BaseWorkflow } from '../../../shared/workflows';

export class AdministratorAccessGroupPolicyWorkflow implements BaseWorkflow<GroupPolicy> {
    private get groupPolicyName(): string {
        return this.appConfigService.site.groupPolicy.administratorAccess;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
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
        // Static group policy should not be deleted
    }

    private async get(): Promise<GroupPolicy | null> {
        const groupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(this.transactionId, 1, 1, this.groupPolicyName),
        );

        return groupPolicies[0] ?? null;
    }
}
