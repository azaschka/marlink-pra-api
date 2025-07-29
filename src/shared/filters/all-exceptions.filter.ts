import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { LogService } from '../../log/services/log.service';
import { LogActionType } from '../../log/enums';
import { DateUtility } from '../../shared/utilities';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly logService: LogService) {}

    public async catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest<Request>();
        const res = ctx.getResponse<Response>();

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

        /* ---- Datenbank-Logging ---- */
        await this.logService.logRaw({
            serviceName: process.env.npm_package_name ?? 'pra-api',
            actionType: LogActionType.System,
            actionName: `EXCEPTION ${req.method} ${req.originalUrl}`,
            transactionId: (req.headers['x-transaction-id'] as string) ?? 'n/a',
            initiatedBy: (req.user as { username?: string })?.username ?? 'anonymous',
            creationDate: DateUtility.getCurrentUtcDate(),
            payload: JSON.stringify({
                status,
                message,
                stack: exception instanceof Error ? exception.stack : undefined,
            }),
        });

        /* ---- Antwort an den Client ---- */
        res.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            message,
        });
    }
}
