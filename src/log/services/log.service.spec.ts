import { BaseCommand } from '../../core/commands';
import { BaseEvent } from '../../core/events';
import { BaseQuery } from '../../core/queries';
import { SortOrderType } from '../../shared/enums';
import { DateUtility } from '../../shared/utilities';
import { LogActionType } from '../enums';
import { LogEntity } from '../repositories/entities';
import { LogRepositoryService } from '../repositories/services/log-repository.service';
import { LogFilterService } from './log-filter.service';
import { LogService } from './log.service';

const mockServiceName = 'test-service';
jest.mock('../../../package.json', () => ({
    name: 'test-service',
}));

describe('LogService', () => {
    let logService: LogService;
    let logFilterService: LogFilterService;
    let logRepositoryService: LogRepositoryService;

    beforeEach(() => {
        mockDateUtility();
        logRepositoryService = mockLogRepositoryService();
        logFilterService = mockLogFilterService();
        logService = new LogService(logRepositoryService, logFilterService);
    });

    it('should log a command', async () => {
        const logRepositoryCreateMethod = jest.spyOn(logRepositoryService, 'create');
        const logFilterServiceFilterCommandMethod = jest.spyOn(logFilterService, 'filterCommand');
        const command = {
            commandType: 'TestCommand',
            transactionId: 'transaction-1',
            data: {
                someData: 'test',
            },
            initiatedBy: 'user-1',
        } as BaseCommand;

        await logService.logCommand(command);

        expect(logRepositoryCreateMethod).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceName: mockServiceName,
                actionType: LogActionType.Command,
                actionName: 'TestCommand',
                transactionId: 'transaction-1',
                initiatedBy: 'user-1',
                creationDate: new Date('2025-01-01T00:00:00Z'),
                payload: JSON.stringify(command),
            }),
        );
        expect(logFilterServiceFilterCommandMethod).toHaveBeenCalledWith(command);
    });

    it('should log a query', async () => {
        const logRepositoryCreateMethod = jest.spyOn(logRepositoryService, 'create');

        await logService.logQuery({
            queryType: 'TestQuery',
            transactionId: 'transaction-2',
            data: {
                someData: 'test',
            },
        } as BaseQuery);

        expect(logRepositoryCreateMethod).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceName: mockServiceName,
                actionType: LogActionType.Query,
                actionName: 'TestQuery',
                transactionId: 'transaction-2',
                initiatedBy: undefined,
                creationDate: new Date('2025-01-01T00:00:00Z'),
                payload: JSON.stringify({
                    queryType: 'TestQuery',
                    transactionId: 'transaction-2',
                    data: {
                        someData: 'test',
                    },
                }),
            }),
        );
    });

    it('should log an event', async () => {
        const logRepositoryCreateMethod = jest.spyOn(logRepositoryService, 'create');

        await logService.logEvent({
            eventType: 'TestEvent',
            transactionId: 'transaction-3',
            eventTime: '2024-01-01T00:00:00Z',
            id: 'event-1',
            payload: {
                someData: 'test',
            },
        } as BaseEvent);

        expect(logRepositoryCreateMethod).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceName: mockServiceName,
                actionType: LogActionType.Event,
                actionName: 'TestEvent',
                transactionId: 'transaction-3',
                initiatedBy: undefined,
                creationDate: new Date('2024-01-01T00:00:00Z'),
                payload: JSON.stringify({
                    someData: 'test',
                }),
            }),
        );
    });

    it('should retrieve logs', async () => {
        const expectedResults = [{ id: 1 } as LogEntity];
        const logRepositoryServiceFindByDateBetweenMethod = jest
            .spyOn(logRepositoryService, 'findByDateBetween')
            .mockResolvedValue(expectedResults);

        const result = await logService.retrieveLogs(
            10,
            1,
            new Date('2024-01-01'),
            new Date('2024-01-02'),
            SortOrderType.Ascending,
        );
        expect(logRepositoryServiceFindByDateBetweenMethod).toHaveBeenCalledWith(
            1,
            10,
            new Date('2024-01-01'),
            new Date('2024-01-02'),
            SortOrderType.Ascending,
        );
        expect(result).toBe(expectedResults);
    });
});

function mockLogRepositoryService() {
    const logRepositoryService = {} as LogRepositoryService;
    logRepositoryService.create = jest.fn();
    logRepositoryService.findByDateBetween = jest.fn();
    logRepositoryService.countByDateBetween = jest.fn();

    return logRepositoryService;
}

function mockLogFilterService() {
    const logFilterService = {} as LogFilterService;
    logFilterService.filterCommand = jest.fn().mockImplementation((command) => command as BaseCommand);
    return logFilterService;
}

function mockDateUtility() {
    DateUtility.getCurrentUtcDate = jest.fn(() => new Date('2025-01-01T00:00:00Z'));
}
