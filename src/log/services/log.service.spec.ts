import {
    CreateBeyondtrustInstanceCommand,
    ModifyBeyondtrustInstanceCommand,
} from '../../beyondtrust-instance/commands';
import { BillingType } from '../../beyondtrust-instance/enums';
import { BaseCommand } from '../../core/commands';
import { BaseEvent } from '../../core/events';
import { BaseQuery } from '../../core/queries';
import { SortOrderType } from '../../shared/enums';
import { DateUtility } from '../../shared/utilities';
import { LogActionType } from '../enums';
import { LogEntity } from '../repositories/entities';
import { LogRepositoryService } from '../repositories/services/log-repository.service';
import { LogFilterService } from './log-filter.service';
import { LogWriterService } from './log-writer.service';
import { LogService } from './log.service';

const mockServiceName = 'test-service';
jest.mock('../../../package.json', () => ({
    name: 'test-service',
}));

describe('LogService', () => {
    let logService: LogService;
    let logFilterService: LogFilterService;
    let logRepositoryService: LogRepositoryService;
    let logWriterService: LogWriterService;

    beforeEach(() => {
        mockDateUtility();
        logRepositoryService = mockLogRepositoryService();
        logFilterService = mockLogFilterService();
        logWriterService = { enqueue: jest.fn() } as unknown as LogWriterService;
        logService = new LogService(logRepositoryService, logFilterService, logWriterService);
    });

    it('should log a command', () => {
        const logWriterEnqueueMethod = jest.spyOn(logWriterService, 'enqueue');
        const logFilterServiceFilterCommandMethod = jest.spyOn(logFilterService, 'filterCommand');
        const command = {
            commandType: 'TestCommand',
            transactionId: 'transaction-1',
            data: {
                someData: 'test',
            },
            initiatedBy: 'user-1',
        } as BaseCommand;

        logService.logCommand(command);

        expect(logWriterEnqueueMethod).toHaveBeenCalledWith(
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

    it('should log a query', () => {
        const logWriterEnqueueMethod = jest.spyOn(logWriterService, 'enqueue');

        logService.logQuery({
            queryType: 'TestQuery',
            transactionId: 'transaction-2',
            data: {
                someData: 'test',
            },
        } as BaseQuery);

        expect(logWriterEnqueueMethod).toHaveBeenCalledWith(
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

    it('should log an event', () => {
        const logWriterEnqueueMethod = jest.spyOn(logWriterService, 'enqueue');

        logService.logEvent({
            eventType: 'TestEvent',
            transactionId: 'transaction-3',
            eventTime: '2024-01-01T00:00:00Z',
            id: 'event-1',
            payload: {
                someData: 'test',
            },
        } as BaseEvent);

        expect(logWriterEnqueueMethod).toHaveBeenCalledWith(
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

    it('should log log data', () => {
        const logWriterEnqueueMethod = jest.spyOn(logWriterService, 'enqueue');

        logService.log('CustomAction', 'transaction-4', 'user-2', JSON.stringify({ key: 'value' }));

        expect(logWriterEnqueueMethod).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceName: 'test-service',
                actionType: LogActionType.System,
                actionName: 'CustomAction',
                transactionId: 'transaction-4',
                initiatedBy: 'user-2',
                creationDate: new Date('2025-01-01T00:00:00Z'),
                payload: JSON.stringify({ key: 'value' }),
            }),
        );
    });

    it('should truncate an action name that exceeds the column length', () => {
        const enqueue = jest.spyOn(logWriterService, 'enqueue');

        logService.log('x'.repeat(5000), 'transaction-1', undefined, '{}');

        const entry = enqueue.mock.calls[0]?.[0] as LogEntity;
        expect(entry.actionName.length).toBeLessThanOrEqual(1000);
        expect(entry.actionName.endsWith('…[truncated]')).toBe(true);
    });

    it('should truncate a payload to the byte limit of the TEXT column without splitting a character', () => {
        const enqueue = jest.spyOn(logWriterService, 'enqueue');

        logService.log('action', 'transaction-1', undefined, 'é'.repeat(40000));

        const entry = enqueue.mock.calls[0]?.[0] as LogEntity;
        expect(Buffer.byteLength(entry.payload, 'utf8')).toBeLessThanOrEqual(60000);
        expect(entry.payload).not.toContain('\uFFFD');
        expect(entry.payload.endsWith('…[truncated]')).toBe(true);
    });

    it('should write durable entries directly and wait for the database', async () => {
        const create = jest.spyOn(logRepositoryService, 'create');
        const enqueue = jest.spyOn(logWriterService, 'enqueue');

        await logService.logDurably('RESET', 'transaction-1', 'user-1', '{}');

        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({ actionType: LogActionType.System, actionName: 'RESET', initiatedBy: 'user-1' }),
        );
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('should redact secrets in command payloads at any depth', () => {
        const enqueue = jest.spyOn(logWriterService, 'enqueue');

        logService.logCommand({
            commandType: 'create-beyondtrust-instance',
            transactionId: 'transaction-1',
            authClientId: 'client-id',
            authClientSecret: 'super-secret',
            nested: { password: 'p4ss', accessToken: 'token-value', tokenType: 'Bearer' },
        } as unknown as BaseCommand);

        const entry = enqueue.mock.calls[0]?.[0] as LogEntity;
        expect(entry.payload).not.toContain('super-secret');
        expect(entry.payload).not.toContain('p4ss');
        expect(entry.payload).not.toContain('token-value');
        expect(JSON.parse(entry.payload)).toMatchObject({
            authClientId: 'client-id',
            authClientSecret: '[REDACTED]',
            nested: { password: '[REDACTED]', accessToken: '[REDACTED]', tokenType: 'Bearer' },
        });
    });

    it.each([
        new CreateBeyondtrustInstanceCommand(
            'transaction-1',
            'Instance',
            'client-id',
            'super-secret',
            'https://bt.example/oauth2/token',
            'https://bt.example/api',
            BillingType.User,
            null,
            'bt',
        ),
        new ModifyBeyondtrustInstanceCommand('transaction-1', 7, undefined, 'client-id', 'super-secret'),
    ])('should redact the client secret of the real $commandType command', (command) => {
        const enqueue = jest.spyOn(logWriterService, 'enqueue');

        logService.logCommand(command);

        const entry = enqueue.mock.calls[0]?.[0] as LogEntity;
        expect(entry.payload).not.toContain('super-secret');
        expect(JSON.parse(entry.payload)).toMatchObject({ authClientId: 'client-id', authClientSecret: '[REDACTED]' });
    });

    it('should redact secrets in an object payload of a system entry, and keep a string payload as given', () => {
        const enqueue = jest.spyOn(logWriterService, 'enqueue');

        logService.log('EXCEPTION POST /x', 'transaction-1', 'user-1', {
            status: 502,
            message: { response: { token: 'token-value', detail: 'upstream failed' } },
        });
        logService.log('SYSTEM', 'transaction-1', undefined, '{"token":"kept-as-given"}');

        const [objectEntry, stringEntry] = enqueue.mock.calls.map(([entry]) => entry);
        expect(objectEntry?.payload).not.toContain('token-value');
        expect(JSON.parse(objectEntry?.payload ?? '{}')).toEqual({
            status: 502,
            message: { response: { token: '[REDACTED]', detail: 'upstream failed' } },
        });
        expect(stringEntry?.payload).toBe('{"token":"kept-as-given"}');
    });

    it('should redact secrets in event payloads', () => {
        const enqueue = jest.spyOn(logWriterService, 'enqueue');

        logService.logEvent({
            eventType: 'beyondtrust-instance-created',
            transactionId: 'transaction-1',
            eventTime: '2025-01-01T00:00:00Z',
            payload: { beyondtrustInstance: { id: 1, authClientSecret: 'super-secret' } },
        } as unknown as BaseEvent);

        const entry = enqueue.mock.calls[0]?.[0] as LogEntity;
        expect(entry.payload).not.toContain('super-secret');
        expect(JSON.parse(entry.payload)).toEqual({ beyondtrustInstance: { id: 1, authClientSecret: '[REDACTED]' } });
    });

    it('should retrieve logs', async () => {
        const expectedResults = [{ id: 1 } as LogEntity];
        const logRepositoryServiceFindByDateBetweenMethod = jest
            .spyOn(logRepositoryService, 'findByDateBetween')
            .mockResolvedValue(expectedResults);

        const result = await logService.retrieveLogs(
            10,
            1,
            undefined,
            new Date('2024-01-01'),
            new Date('2024-01-02'),
            SortOrderType.Ascending,
            1,
        );
        expect(logRepositoryServiceFindByDateBetweenMethod).toHaveBeenCalledWith(
            1,
            10,
            undefined,
            new Date('2024-01-01'),
            new Date('2024-01-02'),
            SortOrderType.Ascending,
            1,
        );
        expect(result).toBe(expectedResults);
    });

    it('should count logs', async () => {
        const expectedCount = 5;
        const logRepositoryServiceCountByDateBetweenMethod = jest
            .spyOn(logRepositoryService, 'countByDateBetween')
            .mockResolvedValue(expectedCount);

        const result = await logService.countLogs(undefined, new Date('2024-01-01'), new Date('2024-01-02'), 1);
        expect(logRepositoryServiceCountByDateBetweenMethod).toHaveBeenCalledWith(
            undefined,
            new Date('2024-01-01'),
            new Date('2024-01-02'),
            1,
        );
        expect(result).toBe(expectedCount);
    });

    it('should clear logs', async () => {
        const logRepositoryServiceDeleteByDateBetweenMethod = jest
            .spyOn(logRepositoryService, 'deleteByDateBetween')
            .mockResolvedValue();

        await logService.clearLogs(new Date('2024-01-01'), new Date('2024-01-02'), 1);
        expect(logRepositoryServiceDeleteByDateBetweenMethod).toHaveBeenCalledWith(
            new Date('2024-01-01'),
            new Date('2024-01-02'),
            1,
        );
    });
});

function mockLogRepositoryService() {
    const logRepositoryService = {} as LogRepositoryService;
    logRepositoryService.create = jest.fn();
    logRepositoryService.findByDateBetween = jest.fn();
    logRepositoryService.countByDateBetween = jest.fn();
    logRepositoryService.deleteByDateBetween = jest.fn();

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
