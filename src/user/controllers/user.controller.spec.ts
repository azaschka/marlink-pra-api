import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand, ProcessUserForgotPasswordCommand } from '../commands';
import { User } from '../models';
import { RetrieveUsersQuery } from '../queries';
import { UserController } from './user.controller';

describe('UserController', () => {
    let controller: UserController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new UserController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveUsers', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as User[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveUsers('uuid-100', {
                pageSize: 10,
                pageNumber: 1,
                username: 'user-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveUsersQuery('uuid-100', 10, 1, undefined, 'user-1', undefined),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createUser', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as User;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createUser(undefined, {
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

            const result = await controller.modifyUser('uuid-100', 1, {
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

    describe('deleteUser', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteUser(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteUserCommand('uuid-123', 1));
        });
    });

    describe('forgotPassword', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.forgotPassword('uuid-100', { email: 'user1@example.com' });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ProcessUserForgotPasswordCommand('uuid-100', 'user1@example.com'),
            );
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
    queryBus.execute = jest.fn();

    return queryBus;
}
