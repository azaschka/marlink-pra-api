import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
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

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
            exception instanceof HttpException ? exception.getResponse() : AllExceptionsFilter.DEFAULT_ERROR_MESSAGE;

        /* ---- Datenbank-Logging ---- */
        await this.logService.log(
            `${AllExceptionsFilter.ACTION_NAME_PREFIX} ${req.method} ${req.originalUrl}`,
            (req.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string) ?? AllExceptionsFilter.DEFAULT_TRANSACTION_ID,
            (req.user as { username?: string })?.username ?? AllExceptionsFilter.DEFAULT_INITIATED_BY,
            JSON.stringify({
                status,
                message,
                stack: exception instanceof Error ? exception.stack : undefined,
            }),
        );

        /* ---- Antwort an den Client ---- */
        res.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            message,
        });
    }
}
