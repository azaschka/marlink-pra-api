import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../shared/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { User } from '../../user/models';
import { PartialSiteAuditor, PartialSiteAuditorWithUserId, SiteAuditor } from '../models';
import { RetrieveSiteAuditorsByUserIdQuery } from '../queries';
import {
    AdministratorAccessGroupPolicyWorkflow,
    AdministratorGroupPolicyWorkflow,
    AdminOperatorAccessGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
} from './group-policies';
import { SiteAuditorUserWorkflow } from './users';

export class SiteAuditorWorkflow implements BaseWorkflow<PartialSiteAuditorWithUserId> {
    private readonly siteAuditorUserWorkflow: SiteAuditorUserWorkflow;
    private readonly administratorAccessGroupPolicyWorkflow: AdministratorAccessGroupPolicyWorkflow;
    private readonly adminOperatorAccessGroupPolicyWorkflow: AdminOperatorAccessGroupPolicyWorkflow;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteAuditor: PartialSiteAuditor,
        private readonly customerName: string,
        private readonly customerBeyondtrustInstanceId: number,
        private readonly administratorGroupPolicyWorkflow: AdministratorGroupPolicyWorkflow,
        private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow,
    ) {
        this.siteAuditorUserWorkflow = new SiteAuditorUserWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteAuditor,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.administratorAccessGroupPolicyWorkflow = new AdministratorAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );

        this.adminOperatorAccessGroupPolicyWorkflow = new AdminOperatorAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );
    }

    public async getOrCreate(): Promise<PartialSiteAuditorWithUserId> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const administratorAccessGroupPolicy = await this.administratorAccessGroupPolicyWorkflow.getOrCreate();
        const adminOperatorAccessGroupPolicy = await this.adminOperatorAccessGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const siteAuditorUser = await this.siteAuditorUserWorkflow.getOrCreate();

        // Add the site auditor user to the administrator group policy and administrator access group policy
        // and optionally to the admin operator access group policy if the site auditor is an admin operator
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                siteAuditorUser.id,
                [
                    administratorGroupPolicy.id,
                    administratorAccessGroupPolicy.id,
                    this.siteAuditor.isAdminOperator ? adminOperatorAccessGroupPolicy.id : undefined,
                    operatorGroupPolicy.id,
                ].filter((id) => id !== undefined),
                [],
            ),
        );

        return {
            ...this.siteAuditor,
            userId: siteAuditorUser.id,
        };
    }

    public async delete(): Promise<void> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const administratorAccessGroupPolicy = await this.administratorAccessGroupPolicyWorkflow.getOrCreate();
        const adminOperatorAccessGroupPolicy = await this.adminOperatorAccessGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const siteAuditorUser = await this.siteAuditorUserWorkflow.getOrCreate();
        const isSiteAuditorAssociatedWithMultipleSites =
            await this.isSiteAuditorAssociatedWithMultipleSites(siteAuditorUser);

        // When site auditor is associated to only one site, we can remove the user from the group policies
        // Remove the site auditor user from the administrator group policy and administrator access group policy
        // and optionally from the admin operator access group policy if the site auditor is an admin operator
        if (!isSiteAuditorAssociatedWithMultipleSites) {
            await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
                new ModifyUserGroupPoliciesCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    siteAuditorUser.id,
                    [],
                    [
                        administratorGroupPolicy.id,
                        administratorAccessGroupPolicy.id,
                        this.siteAuditor.isAdminOperator ? adminOperatorAccessGroupPolicy.id : undefined,
                        operatorGroupPolicy.id,
                    ].filter((id) => id !== undefined),
                ),
            );
        }
    }

    private async isSiteAuditorAssociatedWithMultipleSites(siteAuditorUser: User) {
        const siteAuditors = await this.queryBus.execute<RetrieveSiteAuditorsByUserIdQuery, SiteAuditor[]>(
            new RetrieveSiteAuditorsByUserIdQuery(this.transactionId, 2, 1, siteAuditorUser.id),
        );

        return siteAuditors.length > 1;
    }
}
