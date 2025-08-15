import { CreateBeyondtrustInstanceBackupCommand } from '../../beyondtrust-instance-backup/commands';
import { BaseCommand } from '../../core/commands';
import { SendUserForgotPasswordEmailCommand } from '../../email/commands';
import { ObjectUtility } from '../../shared/utilities';
import { CreateUserCommand, ModifyUserCommand } from '../../user/commands';
import { LogFilterService } from './log-filter.service';

describe('LogFilterService', () => {
    let logFilterService: LogFilterService;

    beforeEach(() => {
        logFilterService = new LogFilterService();
    });

    describe('filterCommand', () => {
        it.each([
            new CreateUserCommand('transaction-1', 'display-name', 'username', 'password123'),
            new ModifyUserCommand('transaction-3', 123, 'display-name', 'username', 'password123'),
            new CreateBeyondtrustInstanceBackupCommand('transaction-5', 123, 'password123'),
            new SendUserForgotPasswordEmailCommand('transaction-6', 'user@mail.com', 'user-1', 'password123'),
        ])('should return as expected', (command) => {
            const expectedResult = { transactionId: 'transaction-123' } as BaseCommand;
            jest.spyOn(ObjectUtility, 'stripProperties').mockReturnValue(expectedResult);

            const filteredCommand = logFilterService.filterCommand(command);

            expect(filteredCommand).toBe(expectedResult);
            expect(ObjectUtility.stripProperties).toHaveBeenCalledWith(command, 'password');
        });
    });
});
