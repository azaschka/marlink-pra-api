import { SortOrderType } from '../../shared/enums';
import { Log } from '../models';
import { LogService } from '../services/log.service';
import { LogController } from './log.controller';

const DEFAULT_DATE_TIME = new Date('2025-12-01T00:00:00Z');

type MockedLogService = LogService & {
    retrieveLogs: jest.Mock;
    countLogs: jest.Mock;
    clearLogs: jest.Mock;
    purgeAllLogs: jest.Mock;
};

describe('LogController', () => {
    let controller: LogController;
    let logService: MockedLogService;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(DEFAULT_DATE_TIME.getTime());
        logService = mockLogService();
        controller = new LogController(logService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should instantiate without errors', () => {
        expect(controller).toBeDefined();
    });

    describe('retrieveLogs', () => {
        it('should call the log service retrieve and count logs and return the result', async () => {
            const expectedTotalCounts = 123;
            const expectedLogs = [{ actionName: 'test-action-1' }] as Log[];
            const logServiceRetrieveLogsMethod = jest.spyOn(logService, 'retrieveLogs').mockResolvedValue(expectedLogs);
            const logServiceCountLogsMethod = jest
                .spyOn(logService, 'countLogs')
                .mockResolvedValue(expectedTotalCounts);

            const result = await controller.retrieveLogs({
                pageSize: 10,
                pageNumber: 1,
                searchString: undefined,
                creationDateFrom: new Date('2023-01-01T00:00:00Z'),
                creationDateTo: new Date('2023-01-31T23:59:59Z'),
                sortOrderType: SortOrderType.Descending,
                tenantId: 1,
            });

            expect(logServiceRetrieveLogsMethod).toHaveBeenCalledWith(
                10,
                1,
                undefined,
                new Date('2023-01-01T00:00:00Z'),
                new Date('2023-01-31T23:59:59Z'),
                SortOrderType.Descending,
                1,
            );
            expect(logServiceCountLogsMethod).toHaveBeenCalledWith(
                undefined,
                new Date('2023-01-01T00:00:00Z'),
                new Date('2023-01-31T23:59:59Z'),
                1,
            );
            expect(result).toStrictEqual({
                logs: expectedLogs,
                totalCount: expectedTotalCounts,
            });
        });
    });

    describe('clearLogs', () => {
        it.each([
            {
                input: {
                    creationDateFrom: new Date('2025-01-01T00:00:00Z'),
                    creationDateTo: new Date('2025-01-31T23:59:59Z'),
                    tenantId: 1,
                },
                expectedFrom: new Date('2025-01-01T00:00:00Z'),
                expectedTo: new Date('2025-01-31T23:59:59Z'),
                tenantId: 1,
            },
            {
                input: {
                    creationDateFrom: new Date('2025-01-01T00:00:00Z'),
                    creationDateTo: undefined,
                    tenantId: 1,
                },
                expectedFrom: new Date('2025-01-01T00:00:00Z'),
                expectedTo: DEFAULT_DATE_TIME,
                tenantId: 1,
            },
        ])(
            'should call log service clear logs with the correct parameters',
            async ({ input, expectedFrom, expectedTo, tenantId }) => {
                const logServiceClearLogsMethod = jest.spyOn(logService, 'clearLogs').mockResolvedValue(undefined);

                await controller.clearLogs(input);

                expect(logServiceClearLogsMethod).toHaveBeenCalledWith(expectedFrom, expectedTo, tenantId);
            },
        );
    });

    describe('purgeAllLogs', () => {
        it('should call log service purge all logs', async () => {
            const logServicePurgeAllLogsMethod = jest.spyOn(logService, 'purgeAllLogs').mockResolvedValue(undefined);

            await controller.purgeAllLogs();

            expect(logServicePurgeAllLogsMethod).toHaveBeenCalledWith();
        });
    });
});

function mockLogService(): MockedLogService {
    const logService = {} as MockedLogService;
    logService.retrieveLogs = jest.fn();
    logService.countLogs = jest.fn();
    logService.clearLogs = jest.fn();
    logService.purgeAllLogs = jest.fn();

    return logService;
}
