import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../shared/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { User } from '../../user/models';
import { SiteUserType } from '../enums';
import { UserNotFoundException } from '../exceptions';
import { PartialSiteAuditor, PartialSiteAuditorWithUserId, SiteAuditor } from '../models';
import { RetrieveSiteAuditorsByUserIdQuery } from '../queries';
import {
    AdministratorAccessGroupPolicyWorkflow,
    AdministratorGroupPolicyWorkflow,
    AdminOperatorAccessGroupPolicyWorkflow,
    FullAccessGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
} from './group-policies';
import { SiteAuditorUserWorkflow } from './users';

export class SiteAuditorWorkflow implements BaseWorkflow<PartialSiteAuditorWithUserId> {
    private readonly siteAuditorUserWorkflow: SiteAuditorUserWorkflow;
    private readonly administratorAccessGroupPolicyWorkflow: AdministratorAccessGroupPolicyWorkflow;
    private readonly adminOperatorAccessGroupPolicyWorkflow: AdminOperatorAccessGroupPolicyWorkflow;
    private readonly fullAccessGroupPolicyWorkflow: FullAccessGroupPolicyWorkflow;

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

        this.fullAccessGroupPolicyWorkflow = new FullAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );
    }

    /**
     * @throws UserNotFoundException if the site auditor user cannot be found
     * @throws MultipleUsersFoundException if more than one user is found with the same email or username
     */
    public async getOrCreate(): Promise<PartialSiteAuditorWithUserId> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const administratorAccessGroupPolicy = await this.administratorAccessGroupPolicyWorkflow.getOrCreate();
        const adminOperatorAccessGroupPolicy = await this.adminOperatorAccessGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const fullAccessGroupPolicy = await this.fullAccessGroupPolicyWorkflow.getOrCreate();
        const siteAuditorUser = await this.siteAuditorUserWorkflow.getOrCreate();

        if (!siteAuditorUser) {
            throw new UserNotFoundException(
                SiteUserType.SiteAuditor,
                this.siteAuditor.username,
                this.siteAuditor.email,
            );
        }

        // Assign the site auditor user to the appropriate group policies based on their role:
        //
        // Standard auditor (isAdminOperator: false):
        //   - ADMINISTRATORS_{CUSTOMER}   — customer-specific admin group (read/audit access)
        //   - ADMINISTRATOR_ACCESS        — global BeyondTrust admin access policy
        //
        // Admin operator (isAdminOperator: true):
        //   - ADMINISTRATORS_{CUSTOMER}   — customer-specific admin group (read/audit access)
        //   - ADMIN_OPERATOR_ACCESS       — global operator-level access policy (replaces ADMINISTRATOR_ACCESS)
        //   - OPERATOR_{CUSTOMER}         — customer-specific operator group policy
        //   - FULL_ACCESS                 — global full access policy

        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                siteAuditorUser.id,
                [
                    administratorGroupPolicy.id,
                    this.siteAuditor.isAdminOperator ? undefined : administratorAccessGroupPolicy.id,
                    this.siteAuditor.isAdminOperator ? adminOperatorAccessGroupPolicy.id : undefined,
                    this.siteAuditor.isAdminOperator ? operatorGroupPolicy.id : undefined,
                    this.siteAuditor.isAdminOperator ? fullAccessGroupPolicy.id : undefined,
                ].filter((id) => id !== undefined),
                [],
            ),
        );

        return {
            ...this.siteAuditor,
            userId: siteAuditorUser.id,
        };
    }

    /**
     * @throws UserNotFoundException if the site auditor user cannot be found
     * @throws MultipleUsersFoundException if more than one user is found with the same email or username
     */
    public async delete(): Promise<void> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const administratorAccessGroupPolicy = await this.administratorAccessGroupPolicyWorkflow.getOrCreate();
        const adminOperatorAccessGroupPolicy = await this.adminOperatorAccessGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const fullAccessGroupPolicy = await this.fullAccessGroupPolicyWorkflow.getOrCreate();
        const siteAuditorUser = await this.siteAuditorUserWorkflow.getOrCreate();

        if (!siteAuditorUser) {
            throw new UserNotFoundException(
                SiteUserType.SiteAuditor,
                this.siteAuditor.username,
                this.siteAuditor.email,
            );
        }

        const isSiteAuditorAssociatedWithMultipleSites =
            await this.isSiteAuditorAssociatedWithMultipleSites(siteAuditorUser);

        // Only remove group policy memberships when the user is no longer associated with any other site.
        // If the user is a site auditor on multiple sites, the group policies must remain in place.
        // The same role-based policy split applies here as in getOrCreate() — see above for details.
        if (!isSiteAuditorAssociatedWithMultipleSites) {
            await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
                new ModifyUserGroupPoliciesCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    siteAuditorUser.id,
                    [],
                    [
                        administratorGroupPolicy.id,
                        this.siteAuditor.isAdminOperator ? undefined : administratorAccessGroupPolicy.id,
                        this.siteAuditor.isAdminOperator ? adminOperatorAccessGroupPolicy.id : undefined,
                        this.siteAuditor.isAdminOperator ? operatorGroupPolicy.id : undefined,
                        this.siteAuditor.isAdminOperator ? fullAccessGroupPolicy.id : undefined,
                    ].filter((id) => id !== undefined),
                ),
            );
        }

        // The site auditor user is only deleted if they are not associated with any other sites.
        // SiteAuditorUserWorkflow.delete() additionally refuses to delete a non-local account, so the guard
        // against removing an externally provisioned identity cannot be forgotten here.
        if (!isSiteAuditorAssociatedWithMultipleSites) {
            await this.siteAuditorUserWorkflow.delete();
        }
    }

    private async isSiteAuditorAssociatedWithMultipleSites(siteAuditorUser: User) {
        const siteAuditors = await this.queryBus.execute<RetrieveSiteAuditorsByUserIdQuery, SiteAuditor[]>(
            new RetrieveSiteAuditorsByUserIdQuery(this.transactionId, 2, 1, siteAuditorUser.id),
        );

        return siteAuditors.length > 1;
    }
}
