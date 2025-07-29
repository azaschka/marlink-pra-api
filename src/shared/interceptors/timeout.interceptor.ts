import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Observable, TimeoutError, timeout, catchError, throwError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
    constructor(private readonly ms = 15_000) {} // Standard 15s

    public intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            timeout(this.ms),
            catchError(
                (err): Observable<never> =>
                    err instanceof TimeoutError
                        ? throwError(() => new RequestTimeoutException())
                        : throwError(() => err as Error),
            ),
        );
    }
}
