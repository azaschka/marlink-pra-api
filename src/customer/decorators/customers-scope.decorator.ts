import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { Customer } from '../models';

export const CustomersScope = createParamDecorator((_data: unknown, ctx: ExecutionContext): Customer[] => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (request.customers === undefined || request.customers === null) {
        throw new InternalServerErrorException('CustomersScope decorator used without CustomersScopeInterceptor');
    }

    return request.customers;
});
