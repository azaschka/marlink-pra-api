import { applyDecorators, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';

export const TRANSACTION_ID_HEADER = 'X-Transaction-Id';

export function ApiTransactionIdHeader() {
    return applyDecorators(
        ApiHeader({
            name: TRANSACTION_ID_HEADER,
            description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
            required: false,
            schema: {
                type: 'string',
            },
        }),
    );
}

export const TransactionIdHeader = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
});
