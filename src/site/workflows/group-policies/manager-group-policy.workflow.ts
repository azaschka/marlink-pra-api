import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { CreateGroupPolicyCommand, DeleteGroupPolicyCommand } from '../../../group-policy/commands';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { BaseWorkflow } from '../../../shared/workflows';

export class ManagerGroupPolicyWorkflow implements BaseWorkflow<GroupPolicy> {
    /** Name of the policy for a site; also used to recognise it (EXT-27). */
    public static groupPolicyNameFor(
        appConfigService: AppConfigService,
        customerName: string,
        siteName: string,
        siteKey: string,
    ): string {
        return `${appConfigService.site.groupPolicy.managerPrefix}${customerName.toUpperCase()}_${siteName.toUpperCase()}_${siteKey.toUpperCase()}`;
    }

    private get groupPolicyName(): string {
        return ManagerGroupPolicyWorkflow.groupPolicyNameFor(
            this.appConfigService,
            this.customerName,
            this.siteName,
            this.siteKey,
        );
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
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
