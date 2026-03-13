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
import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { CreateCustomerDtoInput, RetrieveCustomersDtoInput } from '../dtos/inputs';
import { Customer } from '../models';
import { RetrieveCustomerByIdQuery } from '../queries';

@Injectable()
export class CustomerRequestPipe implements PipeTransform {
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

        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const businessUnitScopes = this.request.businessUnits;

        if (!businessUnitScopes || businessUnitScopes.length === 0) {
            console.error(`[${transactionId}] CustomerRequestPipe: No business unit scopes found in request`);
            throw new ForbiddenException('No business unit scopes available for validation');
        }

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
                throw new ForbiddenException('Forbidden business unit access');
            }
        } else if (metadata.metatype?.name === CreateCustomerDtoInput.name) {
            // Validate business unit in the body is included in business unit scopes
            const dto = value as CreateCustomerDtoInput;

            if (!businessUnitScopes.includes(dto.businessUnit)) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing customer ID parameter');
            }

            const customer = await this.queryBus.execute<RetrieveCustomerByIdQuery, Customer>(
                new RetrieveCustomerByIdQuery(transactionId, requestParamId),
            );

            if (!businessUnitScopes.includes(customer.beyondtrustInstance.businessUnit)) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        }

        return value;
    }
}
