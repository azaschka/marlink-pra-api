import { applyDecorators, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';

export const ACCESS_KEY_HEADER = 'X-Access-Key';

export function ApiAccessKeyHeader() {
    return applyDecorators(
        ApiHeader({
            name: ACCESS_KEY_HEADER,
            description: 'Access key for authenticating and authorizing requests.',
            required: true,
            schema: {
                type: 'string',
            },
        }),
    );
}

export const AccessKeyHeader = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers[ACCESS_KEY_HEADER.toLowerCase()] as string;
});
