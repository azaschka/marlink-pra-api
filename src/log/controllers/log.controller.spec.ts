/* eslint-disable @typescript-eslint/unbound-method */
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { SortOrderType } from '../../shared/enums';
import { Log } from '../models';
import { LogService } from '../services/log.service';
import { LogController } from './log.controller';

describe('LogController', () => {
    let controller: LogController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let eventBus: EventBus;
    let logService: LogService;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        eventBus = mockEventBus();
        logService = mockLogService();
        controller = new LogController(commandBus, queryBus, eventBus, logService);
    });

    describe('retrieveLogs', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedTotal = 123;
            const expectedResult = [] as Log[];
            const mockRes = mockResponse();
            const logServiceRetrieveLogsMethod = jest
                .spyOn(logService, 'retrieveLogs')
                .mockResolvedValue(expectedResult);
            const logServiceCountLogsMethod = jest.spyOn(logService, 'countLogs').mockResolvedValue(expectedTotal);

            const result = await controller.retrieveLogs(
                {
                    pageSize: 10,
                    pageNumber: 1,
                    creationDateFrom: new Date('2023-01-01T00:00:00Z'),
                    creationDateTo: new Date('2023-01-31T23:59:59Z'),
                    sortOrderType: SortOrderType.Descending,
                },
                mockRes,
            );

            expect(logServiceRetrieveLogsMethod).toHaveBeenCalledWith(
                10,
                1,
                new Date('2023-01-01T00:00:00Z'),
                new Date('2023-01-31T23:59:59Z'),
                SortOrderType.Descending,
            );
            expect(logServiceCountLogsMethod).toHaveBeenCalledWith(
                new Date('2023-01-01T00:00:00Z'),
                new Date('2023-01-31T23:59:59Z'),
            );
            expect(mockRes.set).toHaveBeenCalledTimes(1);
            expect(mockRes.set).toHaveBeenCalledWith('X-Total-Count', expectedTotal.toString());
            expect(result).toBe(expectedResult);
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();
    commandBus.subscribe = jest.fn();

    return commandBus;
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();
    queryBus.subscribe = jest.fn();

    return queryBus;
}

function mockEventBus() {
    const eventBus = {} as EventBus;
    eventBus.publish = jest.fn();
    eventBus.subscribe = jest.fn();

    return eventBus;
}

function mockLogService() {
    const logService = {} as LogService;
    logService.retrieveLogs = jest.fn();
    logService.countLogs = jest.fn();

    return logService;
}

function mockResponse(): Response {
    const res: Partial<Response> = {};
    res.set = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);

    return res as Response;
}
