import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaginationUtility, PasswordGeneratorUtility } from '../../../shared/utilities';
import { BaseWorkflow } from '../../../shared/workflows';
import { CreateUserCommand, DeleteUserCommand } from '../../../user/commands';
import { User } from '../../../user/models';
import { RetrieveUsersQuery } from '../../../user/queries';
import { SiteUserType } from '../../enums';
import { UserSourceType } from '../../../user/enums';
import { MultipleUsersFoundException } from '../../exceptions';
import { PartialSiteSupportTeamMember } from '../../models';

export class SiteSupportTeamMemberUserWorkflow implements BaseWorkflow<User | null> {
    private static readonly PREFERRED_EMAIL_LANGUAGE = 'en-US';
    private static readonly IS_TWO_FACTOR_AUTH_REQUIRED = true;
    private static readonly IS_LOGIN_ALLOWED = true;
    private static readonly FAILED_LOGIN_ATTEMPTS = 0;
    private static readonly MUST_RESET_PASSWORD_ON_NEXT_LOGIN = true;
    private static readonly MAX_USERS_RETRIEVED_PER_PAGE = 100;

    private get userPublicDisplayName(): string {
        return `${this.siteSupportTeamMember.firstname.toUpperCase()} ${this.siteSupportTeamMember.lastname.toUpperCase()}`;
    }

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteSupportTeamMember: PartialSiteSupportTeamMember,
        private readonly customerBeyondtrustInstanceId: number,
    ) {}

    /**
     * @throws MultipleUsersFoundException if more than one user is found with the same email or username
     */
    public async getOrCreate(): Promise<User | null> {
        const user = await this.get();

        if (user || this.siteSupportTeamMember.sourceType === UserSourceType.External) {
            return user;
        }

        return await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                this.userPublicDisplayName,
                this.siteSupportTeamMember.email,
                PasswordGeneratorUtility.generate(), // generate password according to Marlink's password policy
                undefined, // passwordExpirationDate
                this.siteSupportTeamMember.email,
                SiteSupportTeamMemberUserWorkflow.PREFERRED_EMAIL_LANGUAGE,
                SiteSupportTeamMemberUserWorkflow.IS_TWO_FACTOR_AUTH_REQUIRED,
                SiteSupportTeamMemberUserWorkflow.IS_LOGIN_ALLOWED,
                SiteSupportTeamMemberUserWorkflow.FAILED_LOGIN_ATTEMPTS,
                SiteSupportTeamMemberUserWorkflow.MUST_RESET_PASSWORD_ON_NEXT_LOGIN,
            ),
        );
    }

    public async delete(): Promise<void> {
        const user = await this.get();

        if (!user) {
            return;
        }

        await this.commandBus.execute<DeleteUserCommand, void>(
            new DeleteUserCommand(this.transactionId, this.customerBeyondtrustInstanceId, user.id),
        );
    }

    private async get(): Promise<User | null> {
        const isExternalUser = this.siteSupportTeamMember.sourceType === UserSourceType.External;

        const users = await PaginationUtility.queryUntilLastPage((pageNumber: number) =>
            this.queryBus.execute<RetrieveUsersQuery, User[]>(
                new RetrieveUsersQuery(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    SiteSupportTeamMemberUserWorkflow.MAX_USERS_RETRIEVED_PER_PAGE,
                    pageNumber,
                    undefined,
                    isExternalUser ? undefined : this.siteSupportTeamMember.email,
                    this.siteSupportTeamMember.email,
                ),
            ),
        );

        if (users.length > 1) {
            throw new MultipleUsersFoundException(
                SiteUserType.SiteSupportTeamMember,
                undefined,
                this.siteSupportTeamMember.email,
                users.map((user) => user.id),
            );
        }

        return users[0] ?? null;
    }
}
