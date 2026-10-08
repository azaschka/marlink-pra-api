import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';

type ExceptionResponseBody = {
    statusCode: number;
    timestamp: string;
    path: string;
    message: string | object;
};

type JsonMock = jest.Mock<void, [ExceptionResponseBody]>;
type StatusMock = jest.Mock<{ json: JsonMock }, [number]>;

type ResponseMocks = {
    status: StatusMock;
    json: JsonMock;
};

describe('AllExceptionsFilter', () => {
    const originalConsoleError = console.error;

    afterEach(() => {
        console.error = originalConsoleError;
        jest.restoreAllMocks();
    });

    it('does not log conflict exceptions', () => {
        const logService = {
            log: jest.fn(),
        };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        const host = createArgumentsHost({ status, json });
        const exception = new HttpException(
            {
                message: 'Already exists',
                error: 'Conflict',
                statusCode: HttpStatus.CONFLICT,
            },
            HttpStatus.CONFLICT,
        );

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        filter.catch(exception, host);

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(logService.log).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.CONFLICT,
                message: {
                    message: 'Already exists',
                    error: 'Conflict',
                    statusCode: HttpStatus.CONFLICT,
                },
            }),
        );
    });

    it('still logs internal server errors', () => {
        const logService = {
            log: jest.fn(),
        };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        const host = createArgumentsHost({ status, json });
        const exception = new Error('Boom');

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        filter.catch(exception, host);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(logService.log).toHaveBeenCalledTimes(1);
        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Internal server error',
            }),
        );
    });

    it('treats foreign key query failures as conflicts and does not log them', () => {
        const logService = {
            log: jest.fn(),
        };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        const host = createArgumentsHost({ status, json });
        const exception = new QueryFailedError('INSERT', [], new Error('a foreign key constraint fails'));

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        filter.catch(exception, host);

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(logService.log).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(json).toHaveBeenCalledTimes(1);

        const firstCall = json.mock.calls[0];

        if (!firstCall) {
            throw new Error('Expected json response to be called once');
        }

        const [responseBody] = firstCall;

        expect(responseBody.statusCode).toBe(HttpStatus.CONFLICT);
        expect(typeof responseBody.message).toBe('string');

        if (typeof responseBody.message !== 'string') {
            throw new Error('Expected conflict response message to be a string');
        }

        expect(responseBody.message).toContain('a foreign key constraint fails');
    });

    it('sends the response before the error is queued for the log, even when queuing fails', () => {
        const order: string[] = [];
        const logService = {
            log: jest.fn(() => {
                order.push('log');
                throw new Error('log failed');
            }),
        };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        json.mockImplementation(() => {
            order.push('response');
        });
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        filter.catch(new Error('Boom'), createArgumentsHost({ status, json }));

        expect(order).toEqual(['response', 'log']);
        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('does not write health responses to the DB log and reports them on stdout at most once per interval', () => {
        const logService = { log: jest.fn() };
        const filter = new AllExceptionsFilter(logService as never);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const exception = new HttpException({ status: 'error' }, HttpStatus.SERVICE_UNAVAILABLE);

        for (let i = 0; i < 5; i++) {
            const { json, status } = createResponseMocks();
            filter.catch(exception, createArgumentsHost({ status, json }, '/health'));
            expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
        }

        expect(logService.log).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('writes a Sync API outage (connection refused, composed as HttpException) to the DB log', () => {
        const logService = { log: jest.fn() };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const exception = new HttpException('connect ECONNREFUSED 10.0.0.5:9001', HttpStatus.INTERNAL_SERVER_ERROR);

        filter.catch(exception, createArgumentsHost({ status, json }));

        expect(logService.log).toHaveBeenCalledTimes(1);
        expect(logService.log).toHaveBeenCalledWith(
            'EXCEPTION POST /jump-items/web-jumps',
            'n/a',
            'tester',
            expect.objectContaining({ status: 500, message: 'connect ECONNREFUSED 10.0.0.5:9001' }),
        );
    });

    it.each([
        { name: 'pool queue limit', error: new Error('Queue limit reached.') },
        {
            name: 'acquire timeout',
            error: new Error('Timed out after 15000 ms while waiting for a free database connection.'),
        },
        { name: 'lost connection', error: Object.assign(new Error('lost'), { code: 'PROTOCOL_CONNECTION_LOST' }) },
    ])('does not write database connection failures ($name) to the DB log', ({ error }) => {
        const logService = { log: jest.fn() };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        filter.catch(error, createArgumentsHost({ status, json }));

        expect(logService.log).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
});

function createArgumentsHost(responseMocks: ResponseMocks, path = '/jump-items/web-jumps') {
    const request = {
        method: 'POST',
        path,
        originalUrl: path,
        headers: {},
        user: { username: 'tester' },
    };

    return {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => ({
                status: responseMocks.status,
                json: responseMocks.json,
            }),
        }),
    } as ArgumentsHost;
}

function createResponseMocks(): ResponseMocks {
    const json = jest.fn<void, [ExceptionResponseBody]>();
    const status = jest.fn<{ json: JsonMock }, [number]>().mockReturnValue({ json });

    return { status, json };
}
