import { CommandBus, EventBus, ICommand, IEvent, QueryBus } from '@nestjs/cqrs';
// import { AppConfigService } from '../../app-config/services/app-config.service'; // removed — no longer injected after verbose logging was disabled
import { Subscription } from 'rxjs';
import { SortOrderType } from '../../shared/enums';
import { Log } from '../models';
import { LogService } from '../services/log.service';
import { LogController } from './log.controller';

const DEFAULT_DATE_TIME = new Date('2025-12-01T00:00:00Z');

type CommandCallback = (command: ICommand) => void;
type EventCallback = (event: IEvent) => void;

type MockedCommandBus = CommandBus & {
    execute: jest.Mock;
    subscribe: jest.Mock<Subscription, [CommandCallback]>;
};

type MockedEventBus = EventBus & {
    publish: jest.Mock;
    subscribe: jest.Mock<Subscription, [EventCallback]>;
};

type MockedQueryBus = QueryBus & {
    execute: jest.Mock;
    subscribe: jest.Mock;
};

type MockedLogService = LogService & {
    logCommand: jest.Mock<Promise<void>, [ICommand]>;
    logEvent: jest.Mock<Promise<void>, [IEvent]>;
    retrieveLogs: jest.Mock;
    countLogs: jest.Mock;
    clearLogs: jest.Mock;
    purgeAllLogs: jest.Mock;
};

type LogServiceMocks = {
    logService: MockedLogService;
    logCommand: jest.Mock<Promise<void>, [ICommand]>;
    logEvent: jest.Mock<Promise<void>, [IEvent]>;
};

describe('LogController', () => {
    let controller: LogController;
    // let appConfigService: AppConfigService; // removed — no longer in constructor
    let commandBus: MockedCommandBus;
    let queryBus: MockedQueryBus;
    let eventBus: MockedEventBus;
    let logService: MockedLogService;
    let commandSubscribeCallback: CommandCallback;
    let eventSubscribeCallback: EventCallback;
    let logCommandMock: jest.Mock<Promise<void>, [ICommand]>;
    let logEventMock: jest.Mock<Promise<void>, [IEvent]>;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(DEFAULT_DATE_TIME.getTime());
        // appConfigService = mockAppConfigService(); // removed — constructor no longer accepts it
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        eventBus = mockEventBus();
        const logServiceMocks = mockLogService();
        logService = logServiceMocks.logService;
        logCommandMock = logServiceMocks.logCommand;
        logEventMock = logServiceMocks.logEvent;

        commandBus.subscribe.mockImplementation((callback: CommandCallback) => {
            commandSubscribeCallback = callback;

            return new Subscription();
        });

        eventBus.subscribe.mockImplementation((callback: EventCallback) => {
            eventSubscribeCallback = callback;

            return new Subscription();
        });

        // AppConfigService removed from constructor after verbose Command/Query/Event
        // logging was commented out in LogController. Re-add when logging is re-enabled.
        controller = new LogController(commandBus, queryBus, eventBus, logService);
    });

    it('should instantiate without errors', () => {
        expect(controller).toBeDefined();
    });

    describe('constructor subscriptions', () => {
        it('should subscribe to commandBus and log received commands', () => {
            const command = { type: 'TestCommand' };

            commandSubscribeCallback(command);

            expect(logCommandMock).toHaveBeenCalledWith(command);
        });

        it('should subscribe to eventBus and log received events', () => {
            const event = { type: 'TestEvent' };

            eventSubscribeCallback(event);

            expect(logEventMock).toHaveBeenCalledWith(event);
        });
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

// function mockAppConfigService() {
//     return {
//         isProduction: false,
//     } as AppConfigService;
// }

function mockCommandBus(): MockedCommandBus {
    const commandBus = {} as MockedCommandBus;
    commandBus.execute = jest.fn();
    commandBus.subscribe = jest.fn<Subscription, [CommandCallback]>();

    return commandBus;
}

function mockQueryBus(): MockedQueryBus {
    const queryBus = {} as MockedQueryBus;
    queryBus.execute = jest.fn();
    queryBus.subscribe = jest.fn();

    return queryBus;
}

function mockEventBus(): MockedEventBus {
    const eventBus = {} as MockedEventBus;
    eventBus.publish = jest.fn();
    eventBus.subscribe = jest.fn<Subscription, [EventCallback]>();

    return eventBus;
}

function mockLogService(): LogServiceMocks {
    const logService = {} as MockedLogService;
    const logCommand = jest.fn<Promise<void>, [ICommand]>().mockResolvedValue(undefined);
    const logEvent = jest.fn<Promise<void>, [IEvent]>().mockResolvedValue(undefined);

    logService.logCommand = logCommand;
    logService.logEvent = logEvent;
    logService.retrieveLogs = jest.fn();
    logService.countLogs = jest.fn();
    logService.clearLogs = jest.fn();
    logService.purgeAllLogs = jest.fn();

    return {
        logService,
        logCommand,
        logEvent,
    };
}
