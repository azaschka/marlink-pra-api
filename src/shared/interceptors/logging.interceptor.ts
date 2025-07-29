// src/common/interceptors/logging.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { LogService } from '../../log/services/log.service'; // Pfad anpassen

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private static readonly DEFAULT_TRANSACTION_ID = 'n/a';
    private static readonly DEFAULT_INITIATED_BY = 'anonymous';

    constructor(private readonly logService: LogService) {}

    public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const httpCtx = context.switchToHttp();
        const req = httpCtx.getRequest<Request>();
        const startTime = Date.now();

        return next.handle().pipe(
            tap(() => {
                // TODO: Clean up, as we don't need to log every request, but only errors or specific actions
                // const duration = Date.now() - startTime;
                // this.logService
                //     .logRaw({
                //         serviceName: process.env.npm_package_name ?? 'pra-api',
                //         actionType: LogActionType.System,
                //         actionName: `${req.method} ${req.originalUrl}`,
                //         transactionId: (req.headers['x-transaction-id'] as string) ?? 'n/a',
                //         initiatedBy: (req.user as { username?: string })?.username ?? 'anonymous',
                //         creationDate: DateUtility.getCurrentUtcDate(),
                //         payload: JSON.stringify({
                //             duration,
                //             status: httpCtx.getResponse<{ statusCode: number }>().statusCode,
                //         }),
                //     })
                //     .catch(() => void 0);
            }),
            catchError((err: unknown) => {
                const duration = Date.now() - startTime;
                const errorMessage = err instanceof Error ? err.message : String(err);
                this.logService
                    .log(
                        `${req.method} ${req.originalUrl}✖`,
                        (req.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string) ??
                            LoggingInterceptor.DEFAULT_TRANSACTION_ID,
                        (req.user as { username?: string })?.username ?? LoggingInterceptor.DEFAULT_INITIATED_BY,
                        JSON.stringify({ duration, error: errorMessage }),
                    )
                    .catch(() => void 0);
                return throwError(() => err); // Re-throw the error to propagate it further
            }),
        );
    }
}
