// src/common/interceptors/logging.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request } from 'express';
import { LogService } from '../../log/services/log.service'; // Pfad anpassen
import { LogActionType } from '../../log/enums';
import { DateUtility } from '../../shared/utilities';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logService: LogService) {}

    public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const httpCtx = context.switchToHttp();
        const req = httpCtx.getRequest<Request>();
        const startTime = Date.now();

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startTime;
                this.logService
                    .logRaw({
                        serviceName: process.env.npm_package_name ?? 'pra-api',
                        actionType: LogActionType.System,
                        actionName: `${req.method} ${req.originalUrl}`,
                        transactionId: (req.headers['x-transaction-id'] as string) ?? 'n/a',
                        initiatedBy: (req.user as { username?: string })?.username ?? 'anonymous',
                        creationDate: DateUtility.getCurrentUtcDate(),
                        payload: JSON.stringify({
                            duration,
                            status: httpCtx.getResponse<{ statusCode: number }>().statusCode,
                        }),
                    })
                    .catch(() => void 0); // Ignore logging errors to avoid breaking the request flow
            }),
            catchError((err: unknown) => {
                const duration = Date.now() - startTime;
                const errorMessage = err instanceof Error ? err.message : String(err);
                this.logService
                    .logRaw({
                        serviceName: process.env.npm_package_name ?? 'pra-api',
                        actionType: LogActionType.System,
                        actionName: `${req.method} ${req.originalUrl}✖`,
                        transactionId: (req.headers['x-transaction-id'] as string) ?? 'n/a',
                        initiatedBy: (req.user as { username?: string })?.username ?? 'anonymous',
                        creationDate: DateUtility.getCurrentUtcDate(),
                        payload: JSON.stringify({ duration, error: errorMessage }),
                    })
                    .catch(() => void 0);
                return throwError(() => err); // Re-throw the error to propagate it further
            }),
        );
    }
}
