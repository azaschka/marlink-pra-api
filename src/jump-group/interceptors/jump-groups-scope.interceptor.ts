import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../core/decorators';
import { PaginationUtility } from '../../shared/utilities';
import { JumpGroup } from '../models';
import { RetrieveJumpGroupsQuery } from '../queries';

@Injectable()
export class JumpGroupsScopeInterceptor implements NestInterceptor {
    private static readonly PAGE_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.switchToHttp().getRequest<Request>();
        const customerScopes = request.customers!;
        const transactionId = request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const tenantId = request.headers[TENANT_ID_HEADER.toLowerCase()] as unknown as number;

        // Query ALL jump groups first
        const allJumpGroups = await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveJumpGroupsQuery, JumpGroup[]>(
                new RetrieveJumpGroupsQuery(
                    transactionId,
                    tenantId,
                    JumpGroupsScopeInterceptor.PAGE_SIZE,
                    pageNumber,
                    undefined,
                    undefined,
                    undefined,
                ),
            ),
        );

        // Filter jump groups: only include those whose name contains an allowed customer name
        // This ensures jump groups belong to customers in the allowed business units
        const allowedJumpGroups = allJumpGroups.filter((jumpGroup) => {
            // Check if jump group name contains any of the allowed customer names
            return customerScopes.some((customer) => {
                const jumpGroupNameLower = jumpGroup.name.toLowerCase();
                const customerNameLower = customer.name.toLowerCase();
                return jumpGroupNameLower.includes(customerNameLower);
            });
        });

        request.jumpGroups = allowedJumpGroups;

        return next.handle();
    }
}
