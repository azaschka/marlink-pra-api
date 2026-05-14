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

    it('does not log conflict exceptions', async () => {
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

        await filter.catch(exception, host);

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

    it('still logs internal server errors', async () => {
        const logService = {
            log: jest.fn(),
        };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        const host = createArgumentsHost({ status, json });
        const exception = new Error('Boom');

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await filter.catch(exception, host);

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

    it('treats foreign key query failures as conflicts and does not log them', async () => {
        const logService = {
            log: jest.fn(),
        };
        const filter = new AllExceptionsFilter(logService as never);
        const { json, status } = createResponseMocks();
        const host = createArgumentsHost({ status, json });
        const exception = new QueryFailedError('INSERT', [], new Error('a foreign key constraint fails'));

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await filter.catch(exception, host);

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
});

function createArgumentsHost(responseMocks: ResponseMocks) {
    const request = {
        method: 'POST',
        originalUrl: '/jump-items/web-jumps',
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
