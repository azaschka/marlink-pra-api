import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../../shared/workflows';
import { CreateUserCommand, DeleteUserCommand } from '../../../user/commands';
import { User } from '../../../user/models';
import { RetrieveUsersQuery } from '../../../user/queries';
import { PartialSiteManager } from '../../models';

export class SiteManagerUserWorkflow implements BaseWorkflow<User> {
    private get userPublicDisplayName(): string {
        return `${this.appConfigService.site.user.siteManager.publicDisplayNamePrefix} ${this.siteName.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteManager: PartialSiteManager,
    ) {}

    public async getOrCreate(): Promise<User> {
        const user = await this.get();

        if (user) {
            return user;
        }

        return await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                this.transactionId,
                this.userPublicDisplayName,
                this.siteManager.username,
                undefined,
                undefined,
                this.siteManager.email,
            ),
        );
    }

    public async delete(): Promise<void> {
        const user = await this.get();

        if (!user) {
            return;
        }

        await this.commandBus.execute<DeleteUserCommand, void>(new DeleteUserCommand(this.transactionId, user.id));
    }

    private async get(): Promise<User | null> {
        const users = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(
                this.transactionId,
                1,
                1,
                undefined,
                this.siteManager.username,
                this.siteManager.email,
            ),
        );

        return users[0] ?? null;
    }
}
