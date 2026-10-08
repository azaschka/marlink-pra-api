import { HttpException } from '@nestjs/common';
import { AxiosError, HttpStatusCode } from 'axios';

export abstract class ErrorProcessorUtility {
    public static stringify(error: unknown): string {
        if (error instanceof Error) {
            return error.stack ?? error.message;
        }

        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }

    /**
     * Turns a failed Sync API call into the HttpException returned to the client. The original error is kept as
     * cause (for callers that need to tell transport failures apart); it is never part of the response.
     */
    public static composeError(error: unknown) {
        if (error instanceof AxiosError && !error.response) {
            // No URL or host in these messages: they are returned to the client.
            if (ErrorProcessorUtility.isResponseTimeout(error)) {
                return new HttpException(
                    `The PRA Sync API did not answer within ${error.config?.timeout ?? 0} ms`,
                    HttpStatusCode.GatewayTimeout,
                    { cause: error },
                );
            }

            if (error.code === AxiosError.ETIMEDOUT) {
                return new HttpException(
                    'The PRA Sync API could not be reached in time',
                    HttpStatusCode.GatewayTimeout,
                    {
                        cause: error,
                    },
                );
            }
        }

        if (error instanceof AxiosError) {
            return new HttpException(
                error.response?.data ? (error.response?.data as Record<string, unknown>) : error.message,
                error.response?.status || HttpStatusCode.InternalServerError,
                { cause: error },
            );
        }

        return new HttpException(JSON.stringify(error), HttpStatusCode.InternalServerError);
    }

    /**
     * True when a Sync API call (an AxiosError, or the HttpException composed from it) ended because its configured
     * timeout expired before an answer arrived. A 504 that the Sync API itself answered is not such a timeout.
     */
    public static isResponseTimeout(error: unknown): boolean {
        const candidate = error instanceof HttpException ? error.cause : error;

        // axios reports its own timeout as ECONNABORTED ("timeout of <n>ms exceeded"), or as ETIMEDOUT with the same
        // message when transitional.clarifyTimeoutError is set. A plain ETIMEDOUT is the operating system's
        // connect timeout.
        return (
            candidate instanceof AxiosError &&
            !candidate.response &&
            (candidate.code === AxiosError.ECONNABORTED || candidate.code === AxiosError.ETIMEDOUT) &&
            candidate.message.startsWith('timeout of')
        );
    }
}
