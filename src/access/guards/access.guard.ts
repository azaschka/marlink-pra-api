import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { ACCESS_KEY_HEADER, TRANSACTION_ID_HEADER } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { Access } from '../models';
import { RetrieveAccessQuery } from '../queries';

@Injectable()
export class AccessGuard implements CanActivate {
    constructor(private readonly queryBus: QueryBus) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const accessKey = request.headers[ACCESS_KEY_HEADER.toLowerCase()] as string | undefined;

        if (!accessKey) {
            throw new UnauthorizedException(`Missing access key header: ${ACCESS_KEY_HEADER}`);
        }

        if (!request.headers[TRANSACTION_ID_HEADER.toLowerCase()]) {
            request.headers[TRANSACTION_ID_HEADER.toLowerCase()] = UuidUtility.generate();
        }

        const transactionId = request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;

        const access = (
            await this.queryBus.execute<RetrieveAccessQuery, Access[]>(
                new RetrieveAccessQuery(transactionId, 1, 1, accessKey),
            )
        )[0];

        if (!access) {
            throw new UnauthorizedException('Invalid access key');
        }

        request.authInfo = {
            access: access,
            ...request.authInfo,
        };

        return true;
    }
}
