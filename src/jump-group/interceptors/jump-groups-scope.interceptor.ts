import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
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
        const customerScopeNames = customerScopes.map((c) => c.name);
        const transactionId = request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const tenantId = request.headers[TENANT_ID_HEADER.toLowerCase()] as unknown as number;

        const jumpGroups = await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveJumpGroupsQuery, JumpGroup[]>(
                new RetrieveJumpGroupsQuery(
                    transactionId,
                    tenantId,
                    JumpGroupsScopeInterceptor.PAGE_SIZE,
                    pageNumber,
                    undefined,
                    undefined,
                    customerScopeNames.map((name) => `%${name}%`),
                ),
            ),
        );

        // Prevent retrieving all data if no jump groups are found
        // If the behaviour of throwing an exception is unwanted, then enable the line below to set a dummy jump group
        if (jumpGroups.length === 0) {
            // jumpGroups.push({ id: -1 } as JumpGroup);
            throw new ForbiddenException('No jump groups found for the specified customer scopes.');
        }

        request.jumpGroups = jumpGroups;

        return next.handle();
    }
}
