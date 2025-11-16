import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NestInterceptor,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';

@Injectable()
export class BusinessUnitsScopeInterceptor implements NestInterceptor {
    public intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.switchToHttp().getRequest<Request>();
        const transactionId = request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const access = request.authInfo?.access;

        if (!access) {
            console.error(`[${transactionId}] BusinessUnitsScopeInterceptor: Missing access info in request.authInfo`);
            throw new UnauthorizedException('Missing access info');
        }

        // Validate that business units are defined and not empty
        if (!access.value?.businessUnits || access.value.businessUnits.length === 0) {
            console.error(
                `[${transactionId}] BusinessUnitsScopeInterceptor: No business units defined for access key: ${access.key}`,
            );
            throw new ForbiddenException('No business units defined for the specified access key.');
        }

        request['businessUnits'] = access.value.businessUnits;

        return next.handle();
    }
}
