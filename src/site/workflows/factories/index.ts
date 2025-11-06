import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { PartialSiteAdministrator, PartialSiteManager, PartialSiteSupportTeamMember, Site } from '../../models';
import {
    AdministratorGroupPolicyWorkflow,
    ManagerGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
} from '../group-policies';
import { AuthJumpPolicyWorkflow, NotifyJumpPolicyWorkflow } from '../jump-policies';
import { JumpointsWorkflow } from '../jumpoints';
import { SiteAdministratorWorkflow } from '../site-administrator.workflow';
import { SiteManagerWorkflow } from '../site-manager.workflow';
import { SiteSupportTeamMemberWorkflow } from '../site-support-team-member.workflow';

export class WorkflowFactory {
    public static create(
        appConfigService: AppConfigService,
        queryBus: QueryBus,
        commandBus: CommandBus,
        transactionId: string,
        customer: Customer,
        site: Site,
    ): WorkflowFactory {
        return new WorkflowFactory(appConfigService, queryBus, commandBus, transactionId, customer, site);
    }

    private constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly customer: Customer,
        private readonly site: Site,
    ) {}

    public createSiteManagerWorkflow(siteManager: PartialSiteManager): SiteManagerWorkflow {
        return new SiteManagerWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.site.name,
            siteManager,
            this.customer.beyondtrustInstanceId,
            this.createManagerGroupPolicyWorkflow(),
            this.createAuthJumpPolicyWorkflow(),
            this.createNotifyJumpPolicyWorkflow(),
        );
    }

    public createSiteAdministratorWorkflow(siteAdministrator: PartialSiteAdministrator): SiteAdministratorWorkflow {
        return new SiteAdministratorWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            siteAdministrator,
            this.customer.name,
            this.customer.beyondtrustInstanceId,
            this.createAdministratorGroupPolicyWorkflow(),
        );
    }

    public createSiteSupportTeamMemberWorkflow(
        siteSupportTeamMember: PartialSiteSupportTeamMember,
    ): SiteSupportTeamMemberWorkflow {
        return new SiteSupportTeamMemberWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            siteSupportTeamMember,
            this.customer.name,
            this.customer.beyondtrustInstanceId,
            this.createAdministratorGroupPolicyWorkflow(),
            this.createOperatorGroupPolicyWorkflow(),
            this.createJumpointsWorkflow(),
        );
    }

    private createAdministratorGroupPolicyWorkflow(): AdministratorGroupPolicyWorkflow {
        return new AdministratorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customer.name,
            this.customer.beyondtrustInstanceId,
        );
    }

    private createManagerGroupPolicyWorkflow(): ManagerGroupPolicyWorkflow {
        return new ManagerGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.site.name,
            this.site.key,
            this.customer.name,
            this.customer.beyondtrustInstanceId,
        );
    }

    private createAuthJumpPolicyWorkflow(): AuthJumpPolicyWorkflow {
        return new AuthJumpPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.site.name,
            this.site.key,
            this.site.siteManagers,
            this.site.siteApprovers,
            this.customer.name,
            this.customer.beyondtrustInstanceId,
        );
    }

    private createNotifyJumpPolicyWorkflow(): NotifyJumpPolicyWorkflow {
        return new NotifyJumpPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.site.name,
            this.site.key,
            this.site.siteManagers,
            this.customer.name,
            this.customer.beyondtrustInstanceId,
        );
    }

    private createOperatorGroupPolicyWorkflow(): OperatorGroupPolicyWorkflow {
        return new OperatorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.site.name,
            this.site.key,
            this.customer.name,
            this.customer.beyondtrustInstanceId,
        );
    }

    private createJumpointsWorkflow(): JumpointsWorkflow {
        return new JumpointsWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.site.name,
            this.site.key,
            this.customer.name,
            this.customer.businessUnit,
            this.customer.beyondtrustInstanceId,
        );
    }
}
