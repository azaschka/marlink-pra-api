import { ClearExpiredLogsCommandHandler } from './clear-expired-logs.command-handler';
import { ClearExpiredLogsCommand } from '../clear-expired-logs.command';
import { LogService } from '../../services/log.service';
import { DateUtility } from '../../../shared/utilities';

describe('ClearExpiredLogsCommandHandler', () => {
    const FROZEN_DATE = new Date('2026-08-13T00:00:00Z');

    let handler: ClearExpiredLogsCommandHandler;
    let logService: jest.Mocked<Pick<LogService, 'clearLogs'>>;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(FROZEN_DATE.getTime());

        logService = {
            clearLogs: jest
                .fn<Promise<void>, [Date | undefined, Date | undefined, number | undefined]>()
                .mockResolvedValue(undefined),
        };

        handler = new ClearExpiredLogsCommandHandler(logService as unknown as LogService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should call clearLogs with undefined from-date and a cutoff 90 days in the past', async () => {
        const command = new ClearExpiredLogsCommand('test-transaction-id', 90);
        const expectedCutoff = DateUtility.subtractDays(FROZEN_DATE, 90);

        await handler.execute(command);

        expect(logService.clearLogs).toHaveBeenCalledWith(undefined, expectedCutoff);
    });

    it('should call clearLogs with undefined from-date and a cutoff matching the configured retention days', async () => {
        const command = new ClearExpiredLogsCommand('test-transaction-id', 30);
        const expectedCutoff = DateUtility.subtractDays(FROZEN_DATE, 30);

        await handler.execute(command);

        expect(logService.clearLogs).toHaveBeenCalledWith(undefined, expectedCutoff);
    });
});
