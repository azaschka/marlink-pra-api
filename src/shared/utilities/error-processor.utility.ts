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
        if (error instanceof AxiosError) {
            return new HttpException(
                error.response?.data ? (error.response?.data as Record<string, unknown>) : error.message,
                error.response?.status || HttpStatusCode.InternalServerError,
            );
        }

        return new HttpException(JSON.stringify(error), HttpStatusCode.InternalServerError);
    }
}
