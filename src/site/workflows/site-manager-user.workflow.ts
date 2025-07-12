import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../shared/workflows';
import { CreateUserCommand } from '../../user/commands';
import { User } from '../../user/models';
import { RetrieveUsersQuery } from '../../user/queries';
import { SiteApprover } from '../models';

export class SiteManagerUserWorkflow implements BaseWorkflow<User> {
    private get userPublicDisplayName(): string {
        return `${this.appConfigService.site.user.siteManager.publicDisplayNamePrefix}${this.siteName.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly approver: SiteApprover,
    ) {}

    public async getOrCreate(): Promise<User> {
        const users = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(this.transactionId, 1, 1, undefined, this.approver.username, this.approver.email),
        );

        if (users.length > 0 && users[0]) {
            return users[0];
        }

        return await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                this.transactionId,
                this.userPublicDisplayName,
                this.approver.username,
                undefined,
                undefined,
                this.approver.email,
            ),
        );
    }
}
