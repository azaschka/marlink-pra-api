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
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import {
    CreateBeyondtrustInstanceDtoInput,
    ModifyBeyondtrustInstanceDtoInput,
    RetrieveBeyondtrustInstancesDtoInput,
} from '../dtos/inputs';
import { BusinessUnit } from '../enums';
import { BeyondtrustInstance } from '../models';
import { RetrieveBeyondtrustInstanceByIdQuery } from '../queries';

@Injectable()
export class BeyondtrustInstanceRequestPipe implements PipeTransform {
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

        const businessUnitScopes = this.request.businessUnits!;
        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;

        if (metadata.metatype?.name === RetrieveBeyondtrustInstancesDtoInput.name) {
            // Validate business unit scopes with queried business units
            const businessUnitsQuery = ObjectUtility.convertToArray<BusinessUnit | undefined>(
                this.request.query.businessUnits as BusinessUnit | BusinessUnit[] | undefined,
            ).filter((bu) => bu !== undefined);

            if (businessUnitsQuery.length === 0) {
                const dto = value as RetrieveBeyondtrustInstancesDtoInput;

                // If no business units are queried, set to scoped business units
                dto.businessUnits = businessUnitScopes;
            }

            if (!businessUnitsQuery.every((bu) => businessUnitScopes.includes(bu))) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        } else if (metadata.metatype?.name === CreateBeyondtrustInstanceDtoInput.name) {
            const dto = value as CreateBeyondtrustInstanceDtoInput;

            // Validate business unit scope when creating with a specific business unit.
            // If no business unit is set, the instance will be shared (accessible to all BUs).
            if (dto.businessUnit && !businessUnitScopes.includes(dto.businessUnit)) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        } else if (metadata.metatype?.name === ModifyBeyondtrustInstanceDtoInput.name) {
            const dto = value as ModifyBeyondtrustInstanceDtoInput;

            // Validate business unit scope when modifying business unit
            if (dto.businessUnit && !businessUnitScopes.includes(dto.businessUnit)) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing beyondtrust instance ID parameter');
            }

            const beyondtrustInstance = await this.queryBus.execute<
                RetrieveBeyondtrustInstanceByIdQuery,
                BeyondtrustInstance
            >(new RetrieveBeyondtrustInstanceByIdQuery(transactionId, requestParamId));

            if (
                beyondtrustInstance &&
                beyondtrustInstance.businessUnit &&
                !businessUnitScopes.includes(beyondtrustInstance.businessUnit)
            ) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        }

        return value;
    }
}
