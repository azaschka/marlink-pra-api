import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NestInterceptor,
    UnauthorizedException,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../core/decorators';
import { PaginationUtility } from '../../shared/utilities';
import { Customer } from '../models';
import { RetrieveCustomersQuery } from '../queries';

@Injectable()
export class CustomersScopeInterceptor implements NestInterceptor {
    private static readonly PAGE_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.switchToHttp().getRequest<Request>();
        const transactionId = request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const tenantId = request.headers[TENANT_ID_HEADER.toLowerCase()] as unknown as number | undefined;
        const access = request.authInfo?.access;

        if (!access) {
            console.error(`[${transactionId}] CustomersScopeInterceptor: Missing access info in request.authInfo`);
            throw new UnauthorizedException('Missing access info');
        }

        // Validate that business units are defined and not empty
        if (!access.value?.businessUnits || access.value.businessUnits.length === 0) {
            console.error(
                `[${transactionId}] CustomersScopeInterceptor: No business units defined for access key: ${access.key}`,
            );
            throw new ForbiddenException('No business units defined for the specified access key.');
        }

        try {
            const customers = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
                    new RetrieveCustomersQuery(
                        transactionId,
                        CustomersScopeInterceptor.PAGE_SIZE,
                        pageNumber,
                        undefined,
                        undefined,
                        undefined,
                        access.value.businessUnits,
                        tenantId,
                    ),
                ),
            );

            // Prevent retrieving all data if no customers are found
            if (customers.length === 0) {
                console.warn(
                    `[${transactionId}] CustomersScopeInterceptor: No customers found for business units: ${access.value.businessUnits.join(', ')}`,
                );
                throw new ForbiddenException('No customers found for the specified business units.');
            }

            request['customers'] = customers;

            return next.handle();
        } catch (error) {
            console.error(`[${transactionId}] CustomersScopeInterceptor: Error querying customers:`, error);
            throw error;
        }
    }
}
