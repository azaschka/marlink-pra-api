import { ArgumentMetadata, ForbiddenException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { RetrieveJumpointInstallerByCustomerAndSiteDtoInput } from '../dtos/inputs';

@Injectable()
export class JumpointExtensionRequestPipe implements PipeTransform {
    constructor(@Inject(REQUEST) private readonly request: Request) {}

    public transform(value: unknown, metadata: ArgumentMetadata) {
        // Skip if this isn't an HTTP request body, query, param.
        if (metadata.type !== 'query' && metadata.type !== 'body' && metadata.type !== 'param') {
            return value;
        }

        if (!this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()]) {
            this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] = UuidUtility.generate();
        }

        const customerScopes = this.request.customers!;
        const customerScopeBusinessUnits = customerScopes.map((c) => c.businessUnit);

        if (metadata.metatype?.name === RetrieveJumpointInstallerByCustomerAndSiteDtoInput.name) {
            const { businessUnits } = this.request.query as {
                businessUnits?: BusinessUnit[];
            };

            const businessUnitsQuery = ObjectUtility.convertToArray<BusinessUnit | undefined>(businessUnits).filter(
                (pattern) => pattern !== undefined,
            );

            if (businessUnitsQuery.length === 0) {
                const dto = value as RetrieveJumpointInstallerByCustomerAndSiteDtoInput;

                // If no business units are specified in the request, limit to the customer's scope business units.
                dto.businessUnits = customerScopeBusinessUnits;
            }

            if (
                businessUnitsQuery.length > 0 &&
                !ObjectUtility.doesEveryTargetContainSourceSubstring(businessUnitsQuery, customerScopeBusinessUnits)
            ) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
