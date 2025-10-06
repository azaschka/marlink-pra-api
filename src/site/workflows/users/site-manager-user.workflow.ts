import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { PasswordGeneratorUtility } from '../../../shared/utilities';
import { BaseWorkflow } from '../../../shared/workflows';
import { CreateUserCommand, DeleteUserCommand } from '../../../user/commands';
import { User } from '../../../user/models';
import { RetrieveUsersQuery } from '../../../user/queries';
import { PartialSiteManager } from '../../models';

export class SiteManagerUserWorkflow implements BaseWorkflow<User> {
    private static readonly PREFERRED_EMAIL_LANGUAGE = 'en-US';
    private static readonly IS_TWO_FACTOR_AUTH_REQUIRED = true;
    private static readonly IS_LOGIN_ALLOWED = true;
    private static readonly FAILED_LOGIN_ATTEMPTS = 0;
    private static readonly MUST_RESET_PASSWORD_ON_NEXT_LOGIN = true;

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
        private readonly customerBeyondtrustInstanceId: number,
    ) {}

    public async getOrCreate(): Promise<User> {
        const user = await this.get();

        if (user) {
            return user;
        }

        return await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                this.userPublicDisplayName,
                this.siteManager.username,
                PasswordGeneratorUtility.generate(), // generate password according to Marlink's password policy
                undefined, // passwordExpirationDate
                this.siteManager.email,
                SiteManagerUserWorkflow.PREFERRED_EMAIL_LANGUAGE,
                SiteManagerUserWorkflow.IS_TWO_FACTOR_AUTH_REQUIRED,
                SiteManagerUserWorkflow.IS_LOGIN_ALLOWED,
                SiteManagerUserWorkflow.FAILED_LOGIN_ATTEMPTS,
                SiteManagerUserWorkflow.MUST_RESET_PASSWORD_ON_NEXT_LOGIN,
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
        const users = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
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
