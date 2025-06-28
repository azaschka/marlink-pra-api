import { BaseCommand } from '../../../core/commands';
import { ObjectUtility } from '../../../shared/utilities';
import { LogFilterService } from './log-filter.service';

describe('LogFilterService', () => {
    let logFilterService: LogFilterService;

    beforeEach(() => {
        logFilterService = new LogFilterService();
    });

    describe('filterCommand', () => {
        it('should return as expected', () => {
            const command = { transactionId: 'transaction-123' } as BaseCommand;
            jest.spyOn(ObjectUtility, 'stripProperty').mockReturnValue(command);

            const filteredCommand = logFilterService.filterCommand(command);

            expect(filteredCommand).toBe(command);
        });
    });
});
