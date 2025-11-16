import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { BusinessUnit } from '../../customer/enums';

export const BusinessUnitsScope = createParamDecorator((_data: unknown, ctx: ExecutionContext): BusinessUnit[] => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (request.businessUnits === undefined || request.businessUnits === null) {
        throw new InternalServerErrorException(
            'BusinessUnitsScope decorator used without BusinessUnitsScopeInterceptor',
        );
    }

    return request.businessUnits;
});
