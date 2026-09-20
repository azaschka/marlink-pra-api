import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { UserSourceType } from '../../../user/enums';
import { SiteUserType } from '../../enums';
import { PartialSiteManager } from '../../models';
import { BaseSiteUserWorkflow } from './base-site-user.workflow';

export class SiteManagerUserWorkflow extends BaseSiteUserWorkflow {
    constructor(
        private readonly appConfigService: AppConfigService,
        queryBus: QueryBus,
        commandBus: CommandBus,
        transactionId: string,
        private readonly siteName: string,
        private readonly siteManager: PartialSiteManager,
        customerBeyondtrustInstanceId: number,
    ) {
        super(queryBus, commandBus, transactionId, customerBeyondtrustInstanceId);
    }

    protected get siteUserType(): SiteUserType {
        return SiteUserType.SiteManager;
    }

    protected get email(): string {
        return this.siteManager.email;
    }

    protected get sourceType(): UserSourceType {
        return this.siteManager.sourceType;
    }

    protected get localUsername(): string {
        return this.siteManager.username;
    }

    protected get publicDisplayName(): string {
        return `${this.appConfigService.site.user.siteManager.publicDisplayNamePrefix} ${this.siteName.toUpperCase()}`;
    }
}
