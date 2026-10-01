import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand } from '../../../user/commands';
import { UserSourceType } from '../../../user/enums';
import { User } from '../../../user/models';
import { RetrieveUsersQuery } from '../../../user/queries';
import { MultipleUsersFoundException, SourceTypeMismatchException } from '../../exceptions';
import { PartialSiteManager } from '../../models';
import { SiteManagerUserWorkflow } from './site-manager-user.workflow';

/**
 * Covers the rules of R3.2-A003 that have no equivalent in the local user flow, exercised through the site
 * manager workflow because all three roles share BaseSiteUserWorkflow.
 */
describe('BaseSiteUserWorkflow', () => {
    const TRANSACTION_ID = 'transaction-id';
    const BT_INSTANCE_ID = 42;
    /** BeyondTrust's built-in provider that holds local accounts. */
    const LOCAL_SECURITY_PROVIDER_ID = 1;

    let queryBus: QueryBus;
    let commandBus: CommandBus;

    beforeEach(() => {
        queryBus = { execute: jest.fn() } as unknown as QueryBus;
        commandBus = { execute: jest.fn() } as unknown as CommandBus;
    });

    describe('getOrCreate for a non-local user', () => {
        it('should return the resolved user without creating an account', async () => {
            const externalUser = createUser({ id: 7, securityProviderId: 3, email: 'ext@example.com' });
            mockRetrievedUsers([externalUser]);

            const result = await createWorkflow(UserSourceType.External).getOrCreate();

            expect(result).toBe(externalUser);
            expectNoCommandOfType(CreateUserCommand);
        });

        it('should look the user up by email and not by username', async () => {
            mockRetrievedUsers([createUser({ securityProviderId: 3 })]);

            await createWorkflow(UserSourceType.External).getOrCreate();

            const query = firstRetrieveUsersQuery();
            expect(query.username).toBeUndefined();
            expect(query.email).toBe('manager@example.com');
        });

        it('should return null instead of creating an account when the user does not exist', async () => {
            mockRetrievedUsers([]);

            const result = await createWorkflow(UserSourceType.External).getOrCreate();

            expect(result).toBeNull();
            expectNoCommandOfType(CreateUserCommand);
        });

        it('should reject a user that turns out to have no security provider', async () => {
            mockRetrievedUsers([createUser({ securityProviderId: undefined })]);

            await expect(createWorkflow(UserSourceType.External).getOrCreate()).rejects.toThrow(
                SourceTypeMismatchException,
            );
            expectNoCommandOfType(CreateUserCommand);
        });

        it('should reject a user that belongs to the built-in local security provider', async () => {
            mockRetrievedUsers([createUser({ securityProviderId: LOCAL_SECURITY_PROVIDER_ID })]);

            await expect(
                createWorkflow(UserSourceType.External, [LOCAL_SECURITY_PROVIDER_ID]).getOrCreate(),
            ).rejects.toThrow(SourceTypeMismatchException);
            expectNoCommandOfType(CreateUserCommand);
        });

        it('should never modify the account of a non-local user', async () => {
            mockRetrievedUsers([createUser({ securityProviderId: 3, email: 'stale@example.com' })]);

            await createWorkflow(UserSourceType.External).getOrCreate();

            expectNoCommandOfType(ModifyUserCommand);
        });
    });

    describe('getOrCreate for a local user', () => {
        it('should create the account when it does not exist yet', async () => {
            mockRetrievedUsers([]);
            (commandBus.execute as jest.Mock).mockResolvedValue(createUser({ id: 11 }));

            await createWorkflow(UserSourceType.Internal).getOrCreate();

            expect(commandOfType(CreateUserCommand)).toBeDefined();
        });

        it('should not create a local account when the email belongs to a non-local account (EXT-07)', async () => {
            (queryBus.execute as jest.Mock)
                .mockResolvedValueOnce([]) // lookup by username: nothing
                .mockResolvedValueOnce([createUser({ id: 7, username: 'entra-upn', securityProviderId: 3 })]) // by email
                .mockResolvedValue([]);

            await expect(
                createWorkflow(UserSourceType.Internal, [LOCAL_SECURITY_PROVIDER_ID]).getOrCreate(),
            ).rejects.toThrow(SourceTypeMismatchException);

            const emailQuery = ((queryBus.execute as jest.Mock).mock.calls as unknown[][])
                .map((call) => call[0] as RetrieveUsersQuery)
                .find((query) => query.email !== undefined);
            expect(emailQuery?.email).toBe('manager@example.com');
            expect(emailQuery?.username).toBeUndefined();
            expectNoCommandOfType(CreateUserCommand);
        });

        it('should create the local account when only local accounts use the email', async () => {
            (queryBus.execute as jest.Mock)
                .mockResolvedValueOnce([]) // lookup by username: nothing
                .mockResolvedValueOnce([createUser({ id: 8, username: 'other-local', securityProviderId: 1 })])
                .mockResolvedValue([]);
            (commandBus.execute as jest.Mock).mockResolvedValue(createUser({ id: 11 }));

            await createWorkflow(UserSourceType.Internal, [LOCAL_SECURITY_PROVIDER_ID]).getOrCreate();

            expect(commandOfType(CreateUserCommand)).toBeDefined();
        });

        it('should look the user up by username so a changed email does not create a duplicate', async () => {
            mockRetrievedUsers([createUser({ id: 11, email: 'outdated@example.com' })]);
            (commandBus.execute as jest.Mock).mockResolvedValue(createUser({ id: 11 }));

            await createWorkflow(UserSourceType.Internal).getOrCreate();

            const query = firstRetrieveUsersQuery();
            expect(query.username).toBe('manager-username');
            expect(query.email).toBeUndefined();
            expectNoCommandOfType(CreateUserCommand);
            expect(commandOfType(ModifyUserCommand)).toBeDefined();
        });

        it('should reject an account that belongs to an identity provider', async () => {
            mockRetrievedUsers([createUser({ id: 11, securityProviderId: 3 })]);

            await expect(
                createWorkflow(UserSourceType.Internal, [LOCAL_SECURITY_PROVIDER_ID]).getOrCreate(),
            ).rejects.toThrow(SourceTypeMismatchException);
            expectNoCommandOfType(ModifyUserCommand);
            expectNoCommandOfType(DeleteUserCommand);
        });

        it('should accept an account of the built-in local security provider', async () => {
            mockRetrievedUsers([
                createUser({ id: 11, securityProviderId: LOCAL_SECURITY_PROVIDER_ID, email: 'manager@example.com' }),
            ]);

            const result = await createWorkflow(UserSourceType.Internal, [LOCAL_SECURITY_PROVIDER_ID]).getOrCreate();

            expect(result?.id).toBe(11);
            expectNoCommandOfType(CreateUserCommand);
        });

        it('should leave a matching account untouched', async () => {
            mockRetrievedUsers([createUser({ id: 11, email: 'manager@example.com' })]);

            await createWorkflow(UserSourceType.Internal).getOrCreate();

            expectNoCommandOfType(ModifyUserCommand);
            expectNoCommandOfType(CreateUserCommand);
        });
    });

    describe('delete', () => {
        it('should never delete a non-local account', async () => {
            mockRetrievedUsers([createUser({ id: 7, securityProviderId: 3 })]);

            await createWorkflow(UserSourceType.External).delete();

            expectNoCommandOfType(DeleteUserCommand);
        });

        it('should not delete an account that BeyondTrust reports as externally provisioned', async () => {
            mockRetrievedUsers([createUser({ id: 7, securityProviderId: 3 })]);

            await expect(createWorkflow(UserSourceType.Internal).delete()).rejects.toThrow(SourceTypeMismatchException);
            expectNoCommandOfType(DeleteUserCommand);
        });

        it('should delete a local account', async () => {
            mockRetrievedUsers([createUser({ id: 7, securityProviderId: undefined })]);

            await createWorkflow(UserSourceType.Internal).delete();

            expect(commandOfType(DeleteUserCommand)).toBeDefined();
        });

        it('should treat a security provider configured as local as a local account', async () => {
            mockRetrievedUsers([createUser({ id: 7, securityProviderId: 1 })]);

            await createWorkflow(UserSourceType.Internal, [1]).delete();

            expect(commandOfType(DeleteUserCommand)).toBeDefined();
        });
    });

    it('should refuse to act when the lookup is ambiguous', async () => {
        mockRetrievedUsers([
            createUser({ id: 1, securityProviderId: 3 }),
            createUser({ id: 2, securityProviderId: 3 }),
        ]);

        await expect(createWorkflow(UserSourceType.External).getOrCreate()).rejects.toThrow(
            MultipleUsersFoundException,
        );
    });

    function createWorkflow(sourceType: UserSourceType, localSecurityProviderIds: number[] = []) {
        const siteManager: PartialSiteManager = {
            username: 'manager-username',
            email: 'manager@example.com',
            sourceType: sourceType,
        };

        const appConfigService = {
            site: { user: { siteManager: { publicDisplayNamePrefix: 'MANAGER' } } },
            user: { localSecurityProviderIds: localSecurityProviderIds },
        } as unknown as AppConfigService;

        return new SiteManagerUserWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            TRANSACTION_ID,
            'site-name',
            siteManager,
            BT_INSTANCE_ID,
        );
    }

    /** PaginationUtility keeps requesting pages until one comes back empty. */
    function mockRetrievedUsers(users: User[]): void {
        (queryBus.execute as jest.Mock).mockResolvedValueOnce(users).mockResolvedValue([]);
    }

    function createUser(overrides: Partial<User>): User {
        return {
            id: 1,
            publicDisplayName: 'display-name',
            username: 'manager-username',
            email: 'manager@example.com',
            lastSyncDate: new Date(),
            ...overrides,
        } as User;
    }

    function firstRetrieveUsersQuery(): RetrieveUsersQuery {
        const calls = (queryBus.execute as jest.Mock).mock.calls as unknown[][];

        return calls[0]?.[0] as RetrieveUsersQuery;
    }

    function commandOfType<T>(commandType: new (...args: never[]) => T): T | undefined {
        const calls = (commandBus.execute as jest.Mock).mock.calls as unknown[][];

        return calls.map((call) => call[0]).find((command): command is T => command instanceof commandType);
    }

    function expectNoCommandOfType<T>(commandType: new (...args: never[]) => T): void {
        expect(commandOfType(commandType)).toBeUndefined();
    }
});
