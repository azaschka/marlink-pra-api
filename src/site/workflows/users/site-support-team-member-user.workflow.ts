import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { UserSourceType } from '../../../user/enums';
import { SiteUserType } from '../../enums';
import { PartialSiteSupportTeamMember } from '../../models';
import { BaseSiteUserWorkflow } from './base-site-user.workflow';

export class SiteSupportTeamMemberUserWorkflow extends BaseSiteUserWorkflow {
    constructor(
        appConfigService: AppConfigService,
        queryBus: QueryBus,
        commandBus: CommandBus,
        transactionId: string,
        private readonly siteSupportTeamMember: PartialSiteSupportTeamMember,
        customerBeyondtrustInstanceId: number,
    ) {
        super(
            queryBus,
            commandBus,
            transactionId,
            customerBeyondtrustInstanceId,
            appConfigService.user.localSecurityProviderIds,
        );
    }

    protected get siteUserType(): SiteUserType {
        return SiteUserType.SiteSupportTeamMember;
    }

    protected get email(): string {
        return this.siteSupportTeamMember.email;
    }

    protected get sourceType(): UserSourceType {
        return this.siteSupportTeamMember.sourceType;
    }

    /** Support team members have no separate username, their email doubles as the login name. */
    protected get localUsername(): string {
        return this.siteSupportTeamMember.email;
    }

    protected get publicDisplayName(): string {
        return `${this.siteSupportTeamMember.firstname.toUpperCase()} ${this.siteSupportTeamMember.lastname.toUpperCase()}`;
    }
}
