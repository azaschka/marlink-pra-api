import {
    ArgumentMetadata,
    BadRequestException,
    Inject,
    Injectable,
    PipeTransform,
    UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { Customer } from '../../customer/models';
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { CreateSiteDtoInput, RetrieveSitesDtoInput } from '../dtos/inputs';
import { Site } from '../models';
import { RetrieveSiteByIdQuery } from '../queries';

@Injectable()
export class SiteRequestTransformerPipe implements PipeTransform {
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

        if (metadata.metatype?.name === RetrieveSitesDtoInput.name) {
            const customerKeysQuery = ObjectUtility.convertToArray<string | undefined>(
                this.request.query.customerKeys as string | string[] | undefined,
            ).filter((ck) => ck !== undefined);

            if (customerKeysQuery.length === 0) {
                const dto = value as RetrieveSitesDtoInput;

                // If no customer keys are queried, set to scoped customer keys
                dto.customerKeys = customerScopes.map((c) => c.key);
            }

            if (!customerKeysQuery.every((ck) => customerScopes.map((c) => c.key).includes(ck))) {
                throw new UnauthorizedException('Unauthorized customer access');
            }
        } else if (metadata.metatype?.name === CreateSiteDtoInput.name) {
            const dto = value as CreateSiteDtoInput;

            // Validate customer key in the body is included in customer scopes
            if (!customerScopes.map((c) => c.key).includes(dto.customerKey)) {
                throw new UnauthorizedException('Unauthorized customer access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing site ID parameter');
            }

            const site = await this.queryBus.execute<RetrieveSiteByIdQuery, Site>(
                new RetrieveSiteByIdQuery(transactionId, requestParamId),
            );

            if (!customerScopes.map((c) => c.key).includes(site.customerKey)) {
                throw new UnauthorizedException('Unauthorized customer access');
            }
        }

        return value;
    }
}
