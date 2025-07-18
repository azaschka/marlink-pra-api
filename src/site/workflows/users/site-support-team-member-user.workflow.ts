import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BaseWorkflow } from '../../../shared/workflows';
import { CreateUserCommand, DeleteUserCommand } from '../../../user/commands';
import { User } from '../../../user/models';
import { RetrieveUsersQuery } from '../../../user/queries';
import { PartialSiteSupportTeamMember } from '../../models';

export class SiteSupportTeamMemberUserWorkflow implements BaseWorkflow<User> {
    private get userPublicDisplayName(): string {
        return `${this.siteSupportTeamMember.firstname.toUpperCase()} ${this.siteSupportTeamMember.lastname.toUpperCase()}`;
    }

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteSupportTeamMember: PartialSiteSupportTeamMember,
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
                this.siteSupportTeamMember.email,
                undefined,
                undefined,
                this.siteSupportTeamMember.email,
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
                this.siteSupportTeamMember.email,
                this.siteSupportTeamMember.email,
            ),
        );

        return users[0] ?? null;
    }
}
