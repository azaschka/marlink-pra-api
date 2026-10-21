import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { UuidUtility } from '../../shared/utilities';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand } from '../commands';
import { UserSourceType } from '../enums';
import { NonLocalUserModificationException } from '../exceptions';
import { User } from '../models';
import { RetrieveUserByIdQuery, RetrieveUsersQuery } from '../queries';
import { UserController } from './user.controller';

describe('UserController', () => {
    let controller: UserController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let appConfigService: AppConfigService;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        appConfigService = mockAppConfigService();
        controller = new UserController(commandBus, queryBus, appConfigService);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveUser', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as User;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveUser('uuid-100', 123, 1);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveUserByIdQuery('uuid-100', 123, 1));
            expect(result).toEqual({ ...expectedResult, sourceType: UserSourceType.Internal });
        });
    });

    describe('retrieveUsers', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as User[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveUsers('uuid-100', 123, {
                pageSize: 10,
                pageNumber: 1,
                username: 'user-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveUsersQuery('uuid-100', 123, 10, 1, undefined, 'user-1', undefined),
            );
            expect(result).toEqual(expectedResult);
        });
    });

    describe('createUser', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as User;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createUser(undefined, 123, {
                publicDisplayName: 'user-1',
                username: 'username-1',
                password: 'password-1',
                passwordExpirationDate: null,
                email: 'user1@example.com',
                preferredEmailLanguage: 'en',
                isTwoFactorAuthRequired: true,
                isLoginAllowed: true,
                failedLoginAttempts: 5,
                mustResetPasswordOnNextLogin: true,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateUserCommand(
                    'uuid-123',
                    123,
                    'user-1',
                    'username-1',
                    'password-1',
                    null,
                    'user1@example.com',
                    'en',
                    true,
                    true,
                    5,
                    true,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyUser', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as User;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyUser('uuid-100', 123, 1, {
                publicDisplayName: 'user-1',
                username: 'username-1',
                password: undefined,
                passwordExpirationDate: null,
                email: 'user1@example.com',
                preferredEmailLanguage: 'fr',
                isTwoFactorAuthRequired: false,
                isLoginAllowed: true,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyUserCommand(
                    'uuid-100',
                    123,
                    1,
                    'user-1',
                    'username-1',
                    undefined,
                    null,
                    'user1@example.com',
                    'fr',
                    false,
                    true,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyUser (non-local)', () => {
        it('should refuse to change properties that only exist on local users', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue({ securityProviderId: 7 } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await expect(controller.modifyUser('uuid-100', 123, 1, { username: 'new-username' })).rejects.toThrow(
                NonLocalUserModificationException,
            );
            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
        });

        it('should allow suspending a non-local user', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue({ securityProviderId: 7 } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue({} as User);

            await controller.modifyUser('uuid-100', 123, 1, { isLoginAllowed: false });

            expect(commandBusExecuteSpy).toHaveBeenCalled();
        });

        // The console sends its whole edit form on every update, so username arrives unchanged and
        // regeneratePassword arrives as false even when only the display name was edited.
        it('should accept an edit that mentions local-only properties without changing them', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingNonLocalUser());
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue({} as User);

            await controller.modifyUser('uuid-100', 123, 1, {
                publicDisplayName: 'Existing Display Name',
                username: 'existing-username',
                email: 'existing@example.com',
                regeneratePassword: false,
                isLoginAllowed: false,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalled();
        });

        it('should not forward unchanged local-only properties of a non-local user (EXT-05)', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingNonLocalUser());
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue({} as User);

            await controller.modifyUser('uuid-100', 123, 1, {
                publicDisplayName: 'Existing Display Name',
                username: 'existing-username',
                email: 'existing@example.com',
                regeneratePassword: false,
                isLoginAllowed: false,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyUserCommand(
                    'uuid-100',
                    123,
                    1,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    false,
                    undefined,
                    undefined,
                ),
            );
        });

        // MARLINKPRA-79: BeyondTrust answers 422 as soon as display name or email are sent for an account of a
        // provider that synchronises them, even with the value it already holds.
        it('should not forward the unchanged display name and email of a non-local user (MARLINKPRA-79)', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingNonLocalUser());
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue({} as User);

            await controller.modifyUser('uuid-100', 123, 1, {
                publicDisplayName: 'Existing Display Name',
                email: 'existing@example.com',
                preferredEmailLanguage: 'de',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledTimes(1);
            const command = commandBusExecuteSpy.mock.calls[0]?.[0] as ModifyUserCommand;
            expect(command.publicDisplayName).toBeUndefined();
            expect(command.email).toBeUndefined();
            expect(command.preferredEmailLanguage).toBe('de');
        });

        it('should not call BeyondTrust when only the unchanged display name and email remain (MARLINKPRA-79)', async () => {
            const existingUser = existingNonLocalUser();
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingUser);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            const result = await controller.modifyUser('uuid-100', 123, 1, {
                publicDisplayName: 'Existing Display Name',
                username: 'existing-username',
                email: 'existing@example.com',
                regeneratePassword: false,
            });

            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
            expect(result).toBe(existingUser);
        });

        it('should refuse to change the display name of a non-local user (MARLINKPRA-79)', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingNonLocalUser());
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            const error = await controller
                .modifyUser('uuid-100', 123, 1, { publicDisplayName: 'Another Display Name' })
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(NonLocalUserModificationException);
            expect((error as NonLocalUserModificationException).properties).toEqual(['publicDisplayName']);
            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
        });

        it('should refuse to change the email address of a non-local user (MARLINKPRA-79)', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingNonLocalUser());
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            const error = await controller
                .modifyUser('uuid-100', 123, 1, { email: 'another@example.com' })
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(NonLocalUserModificationException);
            expect((error as NonLocalUserModificationException).properties).toEqual(['email']);
            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
        });

        it('should name every refused property and forward nothing (MARLINKPRA-79)', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingNonLocalUser());
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            const error = await controller
                .modifyUser('uuid-100', 123, 1, {
                    publicDisplayName: 'Another Display Name',
                    email: 'another@example.com',
                    isLoginAllowed: false,
                })
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(NonLocalUserModificationException);
            expect((error as NonLocalUserModificationException).properties).toEqual(['publicDisplayName', 'email']);
            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
        });

        it('should still forward the display name and email of a local user (MARLINKPRA-79)', async () => {
            // A user without a security provider is local.
            jest.spyOn(queryBus, 'execute').mockResolvedValue({
                publicDisplayName: 'Existing Display Name',
                email: 'existing@example.com',
            } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue({} as User);

            await controller.modifyUser('uuid-100', 123, 1, {
                publicDisplayName: 'Another Display Name',
                email: 'another@example.com',
            });

            const command = commandBusExecuteSpy.mock.calls[0]?.[0] as ModifyUserCommand;
            expect(command.publicDisplayName).toBe('Another Display Name');
            expect(command.email).toBe('another@example.com');
        });

        it('should not call BeyondTrust when nothing but unchanged local-only properties remain', async () => {
            const existingUser = { securityProviderId: 7, username: 'existing-username' } as User;
            jest.spyOn(queryBus, 'execute').mockResolvedValue(existingUser);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            const result = await controller.modifyUser('uuid-100', 123, 1, {
                username: 'existing-username',
                regeneratePassword: false,
            });

            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
            expect(result).toBe(existingUser);
        });

        it('should refuse to change the two-factor requirement of a non-local user', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue({ securityProviderId: 7 } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await expect(controller.modifyUser('uuid-100', 123, 1, { isTwoFactorAuthRequired: true })).rejects.toThrow(
                NonLocalUserModificationException,
            );
            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
        });

        it('should refuse a password regeneration on a non-local user', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue({
                securityProviderId: 7,
                username: 'existing-username',
            } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await expect(
                controller.modifyUser('uuid-100', 123, 1, {
                    username: 'existing-username',
                    regeneratePassword: true,
                }),
            ).rejects.toThrow(NonLocalUserModificationException);
            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
        });
    });

    describe('deleteUser', () => {
        it('should delete a non-local user like a local one, without looking the account up first', async () => {
            const queryBusExecuteSpy = jest
                .spyOn(queryBus, 'execute')
                .mockResolvedValue({ securityProviderId: 7 } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteUser('uuid-100', 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledTimes(1);
            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteUserCommand('uuid-100', 123, 1));
            expect(queryBusExecuteSpy).not.toHaveBeenCalled();
        });

        it('should pass a failed deletion on to the caller', async () => {
            const failure = new Error('BeyondTrust refused to delete the user');
            jest.spyOn(commandBus, 'execute').mockRejectedValue(failure);

            await expect(controller.deleteUser('uuid-100', 123, 1)).rejects.toBe(failure);
        });

        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteUser(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteUserCommand('uuid-123', 123, 1));
        });
    });
});

/** A user of a security provider that is not in the list of local providers, as BeyondTrust and the mirror hold it. */
function existingNonLocalUser(): User {
    return {
        securityProviderId: 7,
        username: 'existing-username',
        publicDisplayName: 'Existing Display Name',
        email: 'existing@example.com',
    } as User;
}

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    // modifyUser and deleteUser resolve the user first to decide whether it is local, so the default has to
    // be a user object rather than undefined.
    queryBus.execute = jest.fn().mockResolvedValue({} as User);

    return queryBus;
}

function mockAppConfigService(): AppConfigService {
    return {
        user: { localSecurityProviderIds: [] },
    } as unknown as AppConfigService;
}
