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
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { CreateCustomerDtoInput, RetrieveCustomersDtoInput } from '../dtos/inputs';
import { BusinessUnit } from '../enums';
import { Customer } from '../models';
import { RetrieveCustomerByIdQuery } from '../queries';

@Injectable()
export class CustomerRequestTransformerPipe implements PipeTransform {
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
        const businessUnitScopes = this.request['businessUnits'] as BusinessUnit[];
        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;

        if (metadata.metatype?.name === RetrieveCustomersDtoInput.name) {
            // Validate business unit scopes with queried business units
            const businessUnitsQuery = ObjectUtility.convertToArray<BusinessUnit | undefined>(
                this.request.query.businessUnits as BusinessUnit | BusinessUnit[] | undefined,
            ).filter((bu) => bu !== undefined);

            if (businessUnitsQuery.length === 0) {
                const dto = value as RetrieveCustomersDtoInput;

                // If no business units are queried, set to scoped business units
                dto.businessUnits = businessUnitScopes;
            }

            if (!businessUnitsQuery.every((bu) => businessUnitScopes.includes(bu))) {
                throw new UnauthorizedException('Unauthorized business unit access');
            }
        } else if (metadata.metatype?.name === CreateCustomerDtoInput.name) {
            // Validate business unit in the body is included in business unit scopes
            const dto = value as CreateCustomerDtoInput;

            if (!businessUnitScopes.includes(dto.businessUnit)) {
                throw new UnauthorizedException('Unauthorized business unit access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing customer ID parameter');
            }

            const customer = await this.queryBus.execute<RetrieveCustomerByIdQuery, Customer>(
                new RetrieveCustomerByIdQuery(transactionId, requestParamId),
            );

            if (!businessUnitScopes.includes(customer.businessUnit)) {
                throw new UnauthorizedException('Unauthorized business unit access');
            }
        }

        return value;
    }
}
