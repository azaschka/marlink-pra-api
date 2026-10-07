import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../shared/workflows';
import { SiteUserType } from '../enums';
import { UserNotFoundException } from '../exceptions';
import { PartialSiteAuditor, PartialSiteAuditorWithUserId } from '../models';
import {
    AdminOperatorAccessGroupPolicyWorkflow,
    AdministratorAccessGroupPolicyWorkflow,
    AdministratorGroupPolicyWorkflow,
    BuSamlDefaultGroupPolicyWorkflow,
    FullAccessGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
    UserGroupPolicyAssignmentWorkflow,
} from './group-policies';
import { RemovedSiteRole, SiteAuditorUserWorkflow, SiteGroupPolicyKeys, SiteUserReferences } from './users';

export class SiteAuditorWorkflow implements BaseWorkflow<PartialSiteAuditorWithUserId> {
    private readonly userGroupPolicyAssignmentWorkflow: UserGroupPolicyAssignmentWorkflow;
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
        private readonly buSamlDefaultGroupPolicyWorkflow: BuSamlDefaultGroupPolicyWorkflow,
    ) {
        this.userGroupPolicyAssignmentWorkflow = new UserGroupPolicyAssignmentWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );

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
        //
        // External users of both kinds additionally (EXT-21):
        //   - GP_{BU}_SAML_DEFAULT        — Business Unit default policy
        const buSamlDefaultGroupPolicy = await this.buSamlDefaultGroupPolicyWorkflow.getFor(
            this.siteAuditor.sourceType,
        );

        await this.userGroupPolicyAssignmentWorkflow.modify(
            SiteUserType.SiteAuditor,
            this.siteAuditor.sourceType,
            this.siteAuditor.email,
            siteAuditorUser,
            [
                administratorGroupPolicy.id,
                this.siteAuditor.isAdminOperator ? undefined : administratorAccessGroupPolicy.id,
                this.siteAuditor.isAdminOperator ? adminOperatorAccessGroupPolicy.id : undefined,
                this.siteAuditor.isAdminOperator ? operatorGroupPolicy.id : undefined,
                this.siteAuditor.isAdminOperator ? fullAccessGroupPolicy.id : undefined,
                buSamlDefaultGroupPolicy?.id,
            ].filter((id) => id !== undefined),
            [],
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
    /**
     * @param removedTogether site user rows removed in the same operation, see SiteUserReferences.remainingRoles
     */
    public async delete(removedTogether: RemovedSiteRole[] = []): Promise<void> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const administratorAccessGroupPolicy = await this.administratorAccessGroupPolicyWorkflow.getOrCreate();
        const adminOperatorAccessGroupPolicy = await this.adminOperatorAccessGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const fullAccessGroupPolicy = await this.fullAccessGroupPolicyWorkflow.getOrCreate();
        const siteAuditorUser = await this.siteAuditorUserWorkflow.getOrCreate();

        // R3.2-A003, 3.1(4): an account that no longer exists in BeyondTrust holds no memberships to remove.
        // Throwing here would make the site auditor row permanently undeletable.
        if (!siteAuditorUser) {
            console.warn(
                `[${this.transactionId}] Site auditor ${this.siteAuditor.email} no longer exists in BeyondTrust, nothing to remove.`,
            );

            return;
        }

        // EXT-03: the same account can hold other roles on this and other sites (customer ADMINISTRATORS, the site
        // OPERATORS policy and FULL_ACCESS are shared). A group policy is only removed when none of those roles
        // needs it, and the account is only deleted when no role is left at all.
        const remainingRoles = await new SiteUserReferences(
            this.queryBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        ).remainingRoles(
            siteAuditorUser.id,
            {
                siteUserType: SiteUserType.SiteAuditor,
                id: this.siteAuditor.id,
                siteId: this.siteAuditor.siteId,
            },
            removedTogether,
        );

        const buSamlDefaultGroupPolicy = await this.buSamlDefaultGroupPolicyWorkflow.getFor(
            this.siteAuditor.sourceType,
        );

        // The same role-based policy split applies here as in getOrCreate(), see above for details.
        const roleCandidates: [string, number][] = this.siteAuditor.isAdminOperator
            ? [
                  [SiteGroupPolicyKeys.customerAdministrators(this.customerName), administratorGroupPolicy.id],
                  [SiteGroupPolicyKeys.ADMIN_OPERATOR_ACCESS, adminOperatorAccessGroupPolicy.id],
                  [SiteGroupPolicyKeys.siteOperators(this.siteAuditor.siteId), operatorGroupPolicy.id],
                  [SiteGroupPolicyKeys.FULL_ACCESS, fullAccessGroupPolicy.id],
              ]
            : [
                  [SiteGroupPolicyKeys.customerAdministrators(this.customerName), administratorGroupPolicy.id],
                  [SiteGroupPolicyKeys.ADMINISTRATOR_ACCESS, administratorAccessGroupPolicy.id],
              ];
        const candidates: [string, number][] = [
            ...roleCandidates,
            ...SiteGroupPolicyKeys.buSamlDefaultCandidate(
                this.buSamlDefaultGroupPolicyWorkflow.businessUnit,
                buSamlDefaultGroupPolicy,
            ),
        ];

        await this.userGroupPolicyAssignmentWorkflow.modify(
            SiteUserType.SiteAuditor,
            this.siteAuditor.sourceType,
            this.siteAuditor.email,
            siteAuditorUser,
            [],
            SiteGroupPolicyKeys.removable(candidates, remainingRoles),
        );

        // The account, local or non-local, is only deleted when it holds no other site role (EXT-18).
        if (remainingRoles.length === 0) {
            await this.siteAuditorUserWorkflow.delete();
        }
    }
}
