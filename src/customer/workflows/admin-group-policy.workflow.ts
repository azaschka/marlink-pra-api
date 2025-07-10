import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateGroupPolicyCommand } from '../../group-policy/commands';
import { GroupPolicy } from '../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { BaseWorkflow } from '../../shared/workflows';

export class AdminGroupPolicyWorkflow implements BaseWorkflow<GroupPolicy> {
    public get adminGroupPolicyName(): string {
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
        const adminGroupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(this.transactionId, 1, 1, this.adminGroupPolicyName),
        );

        if (adminGroupPolicies.length > 0 && adminGroupPolicies[0]) {
            return adminGroupPolicies[0];
        }

        return await this.commandBus.execute<CreateGroupPolicyCommand, GroupPolicy>(
            new CreateGroupPolicyCommand(this.transactionId, this.adminGroupPolicyName),
        );
    }
}
