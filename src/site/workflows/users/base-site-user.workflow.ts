import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaginationUtility, PasswordGeneratorUtility } from '../../../shared/utilities';
import { BaseWorkflow } from '../../../shared/workflows';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand } from '../../../user/commands';
import { UserSourceType } from '../../../user/enums';
import { User } from '../../../user/models';
import { RetrieveUsersQuery } from '../../../user/queries';
import { UserSourceUtility } from '../../../user/utilities';
import { SiteUserType } from '../../enums';
import { MultipleUsersFoundException, SourceTypeMismatchException } from '../../exceptions';

/**
 * Resolves the BeyondTrust user behind a site manager, site auditor or site support team member.
 *
 * The three roles used to carry three near-identical copies of this logic that had drifted apart, which is why
 * they behaved differently for the same input. The differences that remain are expressed by the abstract
 * members below: how the role identifies a local user, and what public display name a new local account gets.
 *
 * Lookup rules:
 *   - non-local user: matched by email only, because the username of an externally provisioned account is
 *     owned by the identity provider and is not part of the ingestion data
 *   - local user: matched by the role's username only. Matching on username *and* email would fail to find an
 *     existing account whose email has changed, and the workflow would then create a duplicate account.
 */
export abstract class BaseSiteUserWorkflow implements BaseWorkflow<User | null> {
    private static readonly PREFERRED_EMAIL_LANGUAGE = 'en-US';
    private static readonly IS_TWO_FACTOR_AUTH_REQUIRED = true;
    private static readonly IS_LOGIN_ALLOWED = true;
    private static readonly FAILED_LOGIN_ATTEMPTS = 0;
    private static readonly MUST_RESET_PASSWORD_ON_NEXT_LOGIN = true;
    private static readonly MAX_USERS_RETRIEVED_PER_PAGE = 100;

    protected constructor(
        protected readonly queryBus: QueryBus,
        protected readonly commandBus: CommandBus,
        protected readonly transactionId: string,
        protected readonly customerBeyondtrustInstanceId: number,
        private readonly localSecurityProviderIds: number[],
    ) {}

    protected abstract get siteUserType(): SiteUserType;

    protected abstract get email(): string;

    protected abstract get sourceType(): UserSourceType;

    /** Username a local account of this role is created with and is looked up by. */
    protected abstract get localUsername(): string;

    protected abstract get publicDisplayName(): string;

    protected get isExternalUser(): boolean {
        return this.sourceType === UserSourceType.External;
    }

    /**
     * @throws MultipleUsersFoundException if more than one user matches
     * @throws SourceTypeMismatchException if the resolved user is not of the supplied source type
     */
    public async getOrCreate(): Promise<User | null> {
        const user = await this.get();

        if (user) {
            return this.isExternalUser ? user : await this.alignLocalUser(user);
        }

        // R3.2-A003, 3.1(2): the ingestion process must never create an account for a non-local user.
        // The caller turns the missing user into an error report entry and continues with the next one.
        if (this.isExternalUser) {
            return null;
        }

        return await this.createLocalUser();
    }

    /**
     * Deletes the BeyondTrust account, but only when it is a local one.
     *
     * Deleting an account is the only irreversible operation in this workflow, so it is guarded twice: by the
     * source type the caller supplied, and by what BeyondTrust reports for the resolved account. A user that
     * belongs to a security provider is never deleted, even if the ingestion data claims it is local.
     *
     * @throws MultipleUsersFoundException if more than one user matches
     * @throws SourceTypeMismatchException if the resolved user is not of the supplied source type
     */
    public async delete(): Promise<void> {
        if (this.isExternalUser) {
            return;
        }

        const user = await this.get();

        if (!user || UserSourceUtility.isExternal(user, this.localSecurityProviderIds)) {
            return;
        }

        await this.commandBus.execute<DeleteUserCommand, void>(
            new DeleteUserCommand(this.transactionId, this.customerBeyondtrustInstanceId, user.id),
        );
    }

    /**
     * @throws MultipleUsersFoundException if more than one user matches
     * @throws SourceTypeMismatchException if the resolved user is not of the supplied source type
     */
    protected async get(): Promise<User | null> {
        const users = await PaginationUtility.queryUntilLastPage((pageNumber: number) =>
            this.queryBus.execute<RetrieveUsersQuery, User[]>(
                new RetrieveUsersQuery(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    BaseSiteUserWorkflow.MAX_USERS_RETRIEVED_PER_PAGE,
                    pageNumber,
                    undefined, // securityProviderId
                    this.isExternalUser ? undefined : this.localUsername,
                    this.isExternalUser ? this.email : undefined,
                ),
            ),
        );

        if (users.length > 1) {
            throw new MultipleUsersFoundException(
                this.siteUserType,
                this.isExternalUser ? undefined : this.localUsername,
                this.email,
                users.map((user) => user.id),
            );
        }

        const user = users[0] ?? null;

        if (user) {
            this.verifySourceType(user);
        }

        return user;
    }

    /**
     * The source type is declared by the caller and is not otherwise verifiable, so this is the only point at
     * which a wrongly flagged ingestion row can be caught. Both directions matter: an account flagged external
     * that is in fact local would never be cleaned up, and an account flagged internal that is in fact
     * provisioned by an identity provider would be treated as ours to modify and delete.
     */
    private verifySourceType(user: User): void {
        const actualSourceType = UserSourceUtility.resolveSourceType(user, this.localSecurityProviderIds);

        if (actualSourceType !== this.sourceType) {
            throw new SourceTypeMismatchException(this.siteUserType, this.email, this.sourceType, actualSourceType);
        }
    }

    /** Keeps the email of a local account in sync with the ingestion data. */
    private async alignLocalUser(user: User): Promise<User> {
        if (user.email === this.email) {
            return user;
        }

        return await this.commandBus.execute<ModifyUserCommand, User>(
            new ModifyUserCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                user.id,
                this.publicDisplayName,
                undefined, // username
                undefined, // password
                undefined, // passwordExpirationDate
                this.email,
            ),
        );
    }

    private async createLocalUser(): Promise<User> {
        return await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                this.publicDisplayName,
                this.localUsername,
                PasswordGeneratorUtility.generate(), // generate password according to Marlink's password policy
                undefined, // passwordExpirationDate
                this.email,
                BaseSiteUserWorkflow.PREFERRED_EMAIL_LANGUAGE,
                BaseSiteUserWorkflow.IS_TWO_FACTOR_AUTH_REQUIRED,
                BaseSiteUserWorkflow.IS_LOGIN_ALLOWED,
                BaseSiteUserWorkflow.FAILED_LOGIN_ATTEMPTS,
                BaseSiteUserWorkflow.MUST_RESET_PASSWORD_ON_NEXT_LOGIN,
            ),
        );
    }
}
