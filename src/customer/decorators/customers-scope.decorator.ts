import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { Customer } from '../models';

export const CustomersScope = createParamDecorator((_data: unknown, ctx: ExecutionContext): Customer[] => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (request['customers'] === undefined || request['customers'] === null) {
        throw new InternalServerErrorException('CustomersScope decorator used without CustomersScopeInterceptor');
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return request['customers'] as Customer[];
});
