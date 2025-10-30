import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Access } from '../models';

@Injectable()
export class BusinessUnitsScopeInterceptor implements NestInterceptor {
    public intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.switchToHttp().getRequest<Request>();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const access = request.authInfo?.access as Access | undefined;

        if (!access) {
            throw new UnauthorizedException('Missing access info');
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        request['businessUnits'] = access.value.businessUnits;

        return next.handle();
    }
}
