import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { UuidUtility } from '../../shared/utilities';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand } from '../commands';
import { UserSourceType } from '../enums';
import { NonLocalUserDeletionException, NonLocalUserModificationException } from '../exceptions';
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
            jest.spyOn(queryBus, 'execute').mockResolvedValue({
                securityProviderId: 7,
                username: 'existing-username',
            } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue({} as User);

            await controller.modifyUser('uuid-100', 123, 1, {
                publicDisplayName: 'New Display Name',
                username: 'existing-username',
                email: 'user@example.com',
                regeneratePassword: false,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalled();
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
        it('should refuse to delete a non-local user', async () => {
            jest.spyOn(queryBus, 'execute').mockResolvedValue({ securityProviderId: 7 } as User);
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await expect(controller.deleteUser(undefined, 123, 1)).rejects.toThrow(NonLocalUserDeletionException);
            expect(commandBusExecuteSpy).not.toHaveBeenCalled();
        });

        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteUser(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteUserCommand('uuid-123', 123, 1));
        });
    });
});

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
