import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { Access } from '../../access/models';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { Customer } from '../models';
import { RetrieveCustomersQuery } from '../queries';

@Injectable()
export class CustomersScopeInterceptor implements NestInterceptor {
    constructor(private readonly queryBus: QueryBus) {}

    public async intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.switchToHttp().getRequest<Request>();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const access = request.authInfo?.access as Access | undefined;

        if (!access) {
            throw new UnauthorizedException('Missing access info');
        }

        const customers = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(
                request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string,
                1,
                1,
                undefined,
                undefined,
                undefined,
                access.value.businessUnits,
            ),
        );

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        request['customers'] = customers;

        return next.handle();
    }
}
