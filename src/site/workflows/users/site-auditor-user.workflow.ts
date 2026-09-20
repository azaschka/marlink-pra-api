import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { UserSourceType } from '../../../user/enums';
import { SiteUserType } from '../../enums';
import { PartialSiteAuditor } from '../../models';
import { BaseSiteUserWorkflow } from './base-site-user.workflow';

export class SiteAuditorUserWorkflow extends BaseSiteUserWorkflow {
    constructor(
        private readonly appConfigService: AppConfigService,
        queryBus: QueryBus,
        commandBus: CommandBus,
        transactionId: string,
        private readonly siteAuditor: PartialSiteAuditor,
        private readonly customerName: string,
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
        return SiteUserType.SiteAuditor;
    }

    protected get email(): string {
        return this.siteAuditor.email;
    }

    protected get sourceType(): UserSourceType {
        return this.siteAuditor.sourceType;
    }

    protected get localUsername(): string {
        return this.siteAuditor.username;
    }

    protected get publicDisplayName(): string {
        return `${this.appConfigService.site.user.siteAuditor.publicDisplayNamePrefix} ${this.customerName.toUpperCase()}`;
    }
}
