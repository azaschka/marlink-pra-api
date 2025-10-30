import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { BusinessUnit } from '../../customer/enums';

export const BusinessUnitsScope = createParamDecorator((_data: unknown, ctx: ExecutionContext): BusinessUnit[] => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (request['businessUnits'] === undefined || request['businessUnits'] === null) {
        throw new InternalServerErrorException(
            'BusinessUnitsScope decorator used without BusinessUnitsScopeInterceptor',
        );
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return request['businessUnits'] as BusinessUnit[];
});
