import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { LogService } from '../../log/services/log.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private static readonly DEFAULT_ERROR_MESSAGE = 'Internal server error';
    private static readonly DEFAULT_TRANSACTION_ID = 'n/a';
    private static readonly DEFAULT_INITIATED_BY = 'anonymous';
    private static readonly ACTION_NAME_PREFIX = 'EXCEPTION';

    constructor(private readonly logService: LogService) {}

    public async catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest<Request>();
        const res = ctx.getResponse<Response>();

        const status = this.determineStatusCode(exception);
        const message = this.determineMessage(exception);

        // Only log real server errors (5xx) to console.
        // 4xx errors are expected business-logic responses and do not need visibility in pod logs.
        if (this.isServerError(status)) {
            console.error(`❌ [${new Date().toISOString()}] Exception caught:`, {
                method: req.method,
                url: req.originalUrl,
                status,
                message,
                transactionId: req.headers[TRANSACTION_ID_HEADER.toLowerCase()],
                user: (req.user as { username?: string })?.username,
            });

            if (exception instanceof Error && exception.stack) {
                console.error('Stack trace:', exception.stack);
            }
        }

        /* ---- Database Logging (non-blocking) ---- */
        try {
            await this.logService.log(
                `${AllExceptionsFilter.ACTION_NAME_PREFIX} ${req.method} ${req.originalUrl}`,
                (req.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string) ??
                    AllExceptionsFilter.DEFAULT_TRANSACTION_ID,
                (req.user as { username?: string })?.username ?? AllExceptionsFilter.DEFAULT_INITIATED_BY,
                JSON.stringify({
                    status,
                    message,
                    stack: exception instanceof Error ? exception.stack : undefined,
                }),
            );
        } catch (logError) {
            // Don't fail the request if logging fails
            console.error('⚠️  Failed to log exception to database:', logError);
        }

        /* ---- Response to Client ---- */
        res.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            message,
        });
    }

    private determineStatusCode(exception: unknown) {
        if (exception instanceof QueryFailedError && exception.message.includes('a foreign key constraint fails')) {
            return HttpStatus.CONFLICT;
        }

        return exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    }

    /** Returns true only for 5xx status codes that represent real server errors. */
    private isServerError(status: number): boolean {
        return status >= HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private determineMessage(exception: unknown) {
        if (exception instanceof QueryFailedError) {
            return exception.message;
        }

        return exception instanceof HttpException ? exception.getResponse() : AllExceptionsFilter.DEFAULT_ERROR_MESSAGE;
    }
}
