import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BaseWorkflow } from '../../shared/workflows';
import { CreateUserCommand, DeleteUserCommand } from '../../user/commands';
import { User } from '../../user/models';
import { RetrieveUsersQuery } from '../../user/queries';
import { SiteApprover } from '../models';

export class SiteManagerUsersWorkflow implements BaseWorkflow<User[]> {
    private get userPublicDisplayName(): string {
        return `${this.appConfigService.site.user.siteManager.publicDisplayNamePrefix}${this.siteName.toUpperCase()}`;
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly approvers: SiteApprover[],
    ) {}

    public async getOrCreate(): Promise<User[]> {
        const users: User[] = [];

        for (const approver of this.approvers) {
            const user = await this.get(approver.username, approver.email);

            if (user) {
                users.push(user);
                continue;
            }

            const createdUser = await this.commandBus.execute<CreateUserCommand, User>(
                new CreateUserCommand(
                    this.transactionId,
                    this.userPublicDisplayName,
                    approver.username,
                    undefined,
                    undefined,
                    approver.email,
                ),
            );

            users.push(createdUser);
        }

        return users;
    }

    public async delete(): Promise<void> {
        for (const approver of this.approvers) {
            const user = await this.get(approver.username, approver.email);

            if (!user) {
                continue;
            }

            await this.commandBus.execute<DeleteUserCommand, void>(new DeleteUserCommand(this.transactionId, user.id));
        }
    }

    private async get(approverUsername: string, approverEmail: string): Promise<User | null> {
        const users = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(this.transactionId, 1, 1, undefined, approverUsername, approverEmail),
        );

        return users[0] ?? null;
    }
}
