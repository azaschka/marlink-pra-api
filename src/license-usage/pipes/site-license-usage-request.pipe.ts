import {
    ArgumentMetadata,
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    PipeTransform,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { Customer } from '../../customer/models';
import { UuidUtility } from '../../shared/utilities';
import { Site } from '../../site/models';
import { RetrieveSiteByIdQuery } from '../../site/queries';

@Injectable()
export class SiteLicenseUsageRequestPipe implements PipeTransform {
    constructor(
        @Inject(REQUEST) private readonly request: Request,
        private readonly queryBus: QueryBus,
    ) {}

    public async transform(value: unknown, metadata: ArgumentMetadata) {
        // Skip if this isn't an HTTP request body, query, param.
        if (metadata.type !== 'query' && metadata.type !== 'body' && metadata.type !== 'param') {
            return value;
        }

        if (!this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()]) {
            this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] = UuidUtility.generate();
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const customerScopes = this.request['customers'] as Customer[];
        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;

        const requestParamId = Number(this.request.params['id']);

        if (!requestParamId) {
            throw new BadRequestException('Missing site ID parameter');
        }

        const site = await this.queryBus.execute<RetrieveSiteByIdQuery, Site>(
            new RetrieveSiteByIdQuery(transactionId, requestParamId),
        );

        if (!customerScopes.map((c) => c.key).includes(site.customerKey)) {
            throw new ForbiddenException('Forbidden customer access');
        }

        return value;
    }
}
