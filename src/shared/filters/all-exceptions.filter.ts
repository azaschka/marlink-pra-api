import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { LogService } from '../../log/services/log.service';
import { DatabaseConnectionUtility } from '../utilities/database-connection.utility';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private static readonly DEFAULT_ERROR_MESSAGE = 'Internal server error';
    private static readonly DEFAULT_TRANSACTION_ID = 'n/a';
    private static readonly DEFAULT_INITIATED_BY = 'anonymous';
    private static readonly ACTION_NAME_PREFIX = 'EXCEPTION';
    private static readonly HEALTH_PATH_PREFIX = '/health';
    // Failures of the database connection itself: writing them to the database only adds load to the
    // resource that is already exhausted, so they go to stdout only. Matched on raw driver and pool errors
    // only, never on an HttpException: those also carry downstream failures such as an unreachable Sync API
    // ("connect ECONNREFUSED" composed by ErrorProcessorUtility), which belong in the system log.
    private static readonly INFRASTRUCTURE_FAILURE_MESSAGES = [
        'queue limit reached',
        'waiting for a free database connection',
        'too many connections',
        'connect econnrefused',
    ];
    private static readonly STDOUT_REPORT_INTERVAL_IN_MS = 10000;

    // Expected failures (health, infrastructure) are written to stdout at most once per interval per kind.
    private readonly lastStdoutReportAt = new Map<string, number>();
    private readonly suppressedSinceReport = new Map<string, number>();

    constructor(private readonly logService: LogService) {}

    public catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest<Request>();
        const res = ctx.getResponse<Response>();

        const status = this.determineStatusCode(exception);
        const message = this.determineMessage(exception);

        // Respond first: neither logging nor its failure may delay or change the response.
        res.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            message,
        });

        if (!this.isServerError(status)) {
            return;
        }

        const expectedFailureKind = this.expectedFailureKind(req, exception);

        if (expectedFailureKind) {
            this.reportExpectedFailure(expectedFailureKind, req, status, message);

            return;
        }

        console.error(`❌ [${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${status}`, {
            message,
            stack: exception instanceof Error ? exception.stack : String(exception),
        });

        try {
            this.logService.log(
                `${AllExceptionsFilter.ACTION_NAME_PREFIX} ${req.method} ${req.originalUrl}`,
                (req.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string) ??
                    AllExceptionsFilter.DEFAULT_TRANSACTION_ID,
                (req.user as { username?: string })?.username ?? AllExceptionsFilter.DEFAULT_INITIATED_BY,
                JSON.stringify({
                    status,
                    message,
                    stack: exception instanceof Error ? exception.stack : undefined,
                    originalUrl: req.originalUrl,
                }),
            );
        } catch (logError) {
            console.error('⚠️  Failed to queue exception for the DB log:', logError);
        }
    }

    private determineStatusCode(exception: unknown) {
        if (exception instanceof QueryFailedError && exception.message.includes('a foreign key constraint fails')) {
            return HttpStatus.CONFLICT;
        }

        return exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private determineMessage(exception: unknown) {
        if (exception instanceof QueryFailedError) {
            return exception.message;
        }

        return exception instanceof HttpException ? exception.getResponse() : AllExceptionsFilter.DEFAULT_ERROR_MESSAGE;
    }

    /** Returns true only for 5xx status codes that represent real server errors. */
    private isServerError(status: number): boolean {
        return status >= Number(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /** Health responses and database connection failures are expected states, not application errors. */
    private expectedFailureKind(req: Request, exception: unknown): 'health' | 'infrastructure' | undefined {
        if ((req.path ?? req.originalUrl ?? '').startsWith(AllExceptionsFilter.HEALTH_PATH_PREFIX)) {
            return 'health';
        }

        if (exception instanceof HttpException) {
            return undefined;
        }

        const text = (exception instanceof Error ? exception.message : String(exception)).toLowerCase();

        if (
            DatabaseConnectionUtility.isTransientConnectionError(exception) ||
            AllExceptionsFilter.INFRASTRUCTURE_FAILURE_MESSAGES.some((fragment) => text.includes(fragment))
        ) {
            return 'infrastructure';
        }

        return undefined;
    }

    private reportExpectedFailure(kind: string, req: Request, status: number, message: unknown): void {
        const now = Date.now();
        const lastReportAt = this.lastStdoutReportAt.get(kind) ?? 0;

        if (now - lastReportAt < AllExceptionsFilter.STDOUT_REPORT_INTERVAL_IN_MS) {
            this.suppressedSinceReport.set(kind, (this.suppressedSinceReport.get(kind) ?? 0) + 1);

            return;
        }

        const suppressed = this.suppressedSinceReport.get(kind) ?? 0;
        this.lastStdoutReportAt.set(kind, now);
        this.suppressedSinceReport.set(kind, 0);
        console.warn(
            `⚠️ [${new Date(now).toISOString()}] ${req.method} ${req.originalUrl} → ${status} (${kind}, not written to the DB log${
                suppressed > 0 ? `, ${suppressed} similar responses suppressed` : ''
            })`,
            typeof message === 'string' ? message : JSON.stringify(message),
        );
    }
}
