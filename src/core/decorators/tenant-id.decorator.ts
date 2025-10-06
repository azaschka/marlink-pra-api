import { applyDecorators, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';

export const TENANT_ID_HEADER = 'X-Tenant-Id';

export function ApiTenantIdHeader() {
    return applyDecorators(
        ApiHeader({
            name: TENANT_ID_HEADER,
            description: 'The identifier for the tenant making the request.',
            required: true,
            schema: {
                type: 'number',
            },
        }),
    );
}

export const TenantIdHeader = createParamDecorator((_data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return Number(request.headers[TENANT_ID_HEADER.toLowerCase()]);
});
