import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../../shared/workflows';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand } from '../../../user/commands';
import { User } from '../../../user/models';
import { RetrieveUsersQuery } from '../../../user/queries';
import { PartialSiteAdministrator } from '../../models';

export class SiteAdministratorUserWorkflow implements BaseWorkflow<User> {
    private get userPublicDisplayName(): string {
        return `${this.appConfigService.site.user.siteAdministrator.publicDisplayNamePrefix} ${this.customerName.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteAdministrator: PartialSiteAdministrator,
        private readonly customerName: string,
    ) {}

    public async getOrCreate(): Promise<User> {
        const user = await this.getOrModify();

        if (user) {
            return user;
        }

        return await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                this.transactionId,
                this.userPublicDisplayName,
                this.siteAdministrator.username,
                undefined,
                undefined,
                this.siteAdministrator.email,
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

    private async getOrModify(): Promise<User | null> {
        const user = await this.get();

        if (!user) {
            return null;
        }

        if (user.email !== this.siteAdministrator.email) {
            return await this.commandBus.execute<ModifyUserCommand, User>(
                new ModifyUserCommand(
                    this.transactionId,
                    user.id,
                    this.userPublicDisplayName, // publicDisplayName
                    undefined, // username
                    undefined, // password
                    undefined, // passwordExpirationDate
                    this.siteAdministrator.email, // email
                ),
            );
        }

        return user;
    }

    private async get(): Promise<User | null> {
        const users = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(this.transactionId, 1, 1, undefined, this.siteAdministrator.username, undefined),
        );

        return users[0] ?? null;
    }
}
