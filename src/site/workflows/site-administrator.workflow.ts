import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../shared/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { User } from '../../user/models';
import { PartialSiteAdministrator, PartialSiteAdministratorWithUserId, SiteAdministrator } from '../models';
import { RetrieveSiteAdministratorsByUserIdQuery } from '../queries';
import {
    AdministratorAccessGroupPolicyWorkflow,
    AdministratorGroupPolicyWorkflow,
    AdminOperatorAccessGroupPolicyWorkflow,
} from './group-policies';
import { SiteAdministratorUserWorkflow } from './users';

export class SiteAdministratorWorkflow implements BaseWorkflow<PartialSiteAdministratorWithUserId> {
    private readonly siteAdministratorUserWorkflow: SiteAdministratorUserWorkflow;
    private readonly administratorAccessGroupPolicyWorkflow: AdministratorAccessGroupPolicyWorkflow;
    private readonly adminOperatorAccessGroupPolicyWorkflow: AdminOperatorAccessGroupPolicyWorkflow;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteAdministrator: PartialSiteAdministrator,
        private readonly customerName: string,
        private readonly administratorGroupPolicyWorkflow: AdministratorGroupPolicyWorkflow,
    ) {
        this.siteAdministratorUserWorkflow = new SiteAdministratorUserWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteAdministrator,
            this.customerName,
        );

        this.administratorAccessGroupPolicyWorkflow = new AdministratorAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
        );

        this.adminOperatorAccessGroupPolicyWorkflow = new AdminOperatorAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
        );
    }

    public async getOrCreate(): Promise<PartialSiteAdministratorWithUserId> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const administratorAccessGroupPolicy = await this.administratorAccessGroupPolicyWorkflow.getOrCreate();
        const adminOperatorAccessGroupPolicy = await this.adminOperatorAccessGroupPolicyWorkflow.getOrCreate();
        const siteAdministratorUser = await this.siteAdministratorUserWorkflow.getOrCreate();

        // Add the site administrator user to the administrator group policy and administrator access group policy
        // and optionally to the admin operator access group policy if the site administrator is an admin operator
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                siteAdministratorUser.id,
                [
                    administratorGroupPolicy.id,
                    administratorAccessGroupPolicy.id,
                    this.siteAdministrator.isAdminOperator ? adminOperatorAccessGroupPolicy.id : undefined,
                ].filter((id) => id !== undefined),
                [],
            ),
        );

        return {
            ...this.siteAdministrator,
            userId: siteAdministratorUser.id,
        };
    }

    public async delete(): Promise<void> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const administratorAccessGroupPolicy = await this.administratorAccessGroupPolicyWorkflow.getOrCreate();
        const adminOperatorAccessGroupPolicy = await this.adminOperatorAccessGroupPolicyWorkflow.getOrCreate();
        const siteAdministratorUser = await this.siteAdministratorUserWorkflow.getOrCreate();
        const isSiteAdministratorAssociatedWithMultipleSites =
            await this.isSiteAdministratorAssociatedWithMultipleSites(siteAdministratorUser);

        // When site administrator is associated to only one site, we can remove the user from the group policies
        // Remove the site administrator user from the administrator group policy and administrator access group policy
        // and optionally from the admin operator access group policy if the site administrator is an admin operator
        if (!isSiteAdministratorAssociatedWithMultipleSites) {
            await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
                new ModifyUserGroupPoliciesCommand(
                    this.transactionId,
                    siteAdministratorUser.id,
                    [],
                    [
                        administratorGroupPolicy.id,
                        administratorAccessGroupPolicy.id,
                        this.siteAdministrator.isAdminOperator ? adminOperatorAccessGroupPolicy.id : undefined,
                    ].filter((id) => id !== undefined),
                ),
            );
        }
    }

    private async isSiteAdministratorAssociatedWithMultipleSites(siteAdministratorUser: User) {
        const siteAdministrators = await this.queryBus.execute<
            RetrieveSiteAdministratorsByUserIdQuery,
            SiteAdministrator[]
        >(new RetrieveSiteAdministratorsByUserIdQuery(this.transactionId, 2, 1, siteAdministratorUser.id));

        return siteAdministrators.length > 1;
    }
}
