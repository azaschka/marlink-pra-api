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

    public static composeError(error: unknown) {
        if (ErrorProcessorUtility.isTimeout(error)) {
            // No URL or host in the message: it is returned to the client.
            return new HttpException(
                `The PRA Sync API did not answer within ${error.config?.timeout ?? 0} ms`,
                HttpStatusCode.GatewayTimeout,
            );
        }

        if (error instanceof AxiosError) {
            return new HttpException(
                error.response?.data ? (error.response?.data as Record<string, unknown>) : error.message,
                error.response?.status || HttpStatusCode.InternalServerError,
            );
        }

        return new HttpException(JSON.stringify(error), HttpStatusCode.InternalServerError);
    }

    /** An outbound call that hit its timeout before any response arrived (axios uses either code). */
    private static isTimeout(error: unknown): error is AxiosError {
        return (
            error instanceof AxiosError &&
            !error.response &&
            (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT)
        );
    }
}
