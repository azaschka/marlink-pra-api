import { HttpException } from '@nestjs/common';
import { AxiosError, AxiosResponse, HttpStatusCode } from 'axios';
import { ErrorProcessorUtility } from './error-processor.utility';

describe('ErrorProcessorUtility', () => {
    describe('stringify', () => {
        describe('not an error type', () => {
            it.each([
                {
                    input: 'An error occurred',
                    expectedOutput: '"An error occurred"',
                },
                {
                    input: { obj: 1, obj2: 'test' },
                    expectedOutput: '{"obj":1,"obj2":"test"}',
                },
            ])('should return as expected', ({ input, expectedOutput }) => {
                const result = ErrorProcessorUtility.stringify(input);

                expect(result).toEqual(expectedOutput);
            });
        });

        describe('error type', () => {
            it.each([
                {
                    input: new Error('An error occurred'),
                    expectedOutput: 'Error: An error occurred',
                },
                {
                    input: new Error('An error occurred', { cause: 'test' }),
                    expectedOutput: 'Error: An error occurred',
                },
                {
                    input: new TypeError('An error occurred'),
                    expectedOutput: 'TypeError: An error occurred',
                },
            ])('should return as expected', ({ input, expectedOutput }) => {
                const result = ErrorProcessorUtility.stringify(input);

                expect(result).toEqual(expect.stringContaining(expectedOutput));
            });
        });
    });

    describe('composeError', () => {
        it('should return HttpException with error message and status code from AxiosError', () => {
            const axiosError = new AxiosError('error-message', 'ERR_BAD_REQUEST', undefined, undefined, <AxiosResponse>{
                status: 400,
                data: { error: 'test' },
            });

            const result = ErrorProcessorUtility.composeError(axiosError);

            expect(result).toBeInstanceOf(HttpException);
            expect(result.getResponse()).toEqual({ error: 'test' });
            expect(result.getStatus()).toBe(400);
        });

        it.each([AxiosError.ECONNABORTED, AxiosError.ETIMEDOUT])(
            'answers 504 without the target address when an outbound call timed out (%s)',
            (code) => {
                const timeoutError = new AxiosError('timeout of 300000ms exceeded', code, {
                    timeout: 300000,
                    url: 'http://pra-sync-api:9001/teams',
                } as never);

                const result = ErrorProcessorUtility.composeError(timeoutError);

                expect(result.getStatus()).toBe(HttpStatusCode.GatewayTimeout);
                expect(result.getResponse()).toBe('The PRA Sync API did not answer within 300000 ms');
            },
        );

        it('keeps the Sync API status when a response arrived, even with a timeout code', () => {
            const error = new AxiosError('x', AxiosError.ECONNABORTED, undefined, undefined, <AxiosResponse>{
                status: 503,
                data: { message: 'busy' },
            });

            expect(ErrorProcessorUtility.composeError(error).getStatus()).toBe(503);
        });

        it('should return HttpException with stringified error for non-Axios errors', () => {
            const nonAxiosError = new Error('Non-Axios error occurred');

            const result = ErrorProcessorUtility.composeError(nonAxiosError);

            expect(result).toBeInstanceOf(HttpException);
            expect(result.getResponse()).toEqual(JSON.stringify(nonAxiosError));
            expect(result.getStatus()).toBe(HttpStatusCode.InternalServerError);
        });
    });
});
