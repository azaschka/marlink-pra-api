import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { SocScope } from '../models';
import { SocScopeUtility } from '../utilities';

/**
 * Resolves the caller's SOC visibility from the request.
 *
 * Relies on `CustomersScopeInterceptor` having populated `request.customers`.
 */
export const SocScopeParam = createParamDecorator((_data: unknown, context: ExecutionContext): SocScope => {
    const request = context.switchToHttp().getRequest<Request>();

    return SocScopeUtility.resolve(request.authInfo?.access?.value?.businessUnits ?? [], request.customers ?? []);
});
