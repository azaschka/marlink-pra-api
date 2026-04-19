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
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ObjectUtility, SuperAdminUtility, UuidUtility } from '../../../shared/utilities';
import { CreateJumpointNodeDtoInput, DeploymentRetrieveJumpointNodesDtoInput } from '../dtos/inputs';
import { JumpointNodeBusinessUnit } from '../enums';
import { JumpointNode } from '../models';
import { RetrieveJumpointNodeByIdQuery } from '../queries';

@Injectable()
export class JumpointNodeRequestPipe implements PipeTransform {
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

        if (SuperAdminUtility.isSuperAdmin(businessUnitScopes ?? [])) {
            return value;
        }

        if (metadata.metatype?.name === DeploymentRetrieveJumpointNodesDtoInput.name) {
            // Validate business unit scopes with queried business units
            const businessUnitsQuery = ObjectUtility.convertToArray<JumpointNodeBusinessUnit | undefined>(
                this.request.query.businessUnits as JumpointNodeBusinessUnit | JumpointNodeBusinessUnit[] | undefined,
            ).filter((bu) => bu !== undefined);

            if (businessUnitsQuery.length === 0) {
                const dto = value as DeploymentRetrieveJumpointNodesDtoInput;

                // If no business units are queried, set to scoped business units
                dto.businessUnits = businessUnitScopes as unknown as JumpointNodeBusinessUnit[];
            }

            if (!businessUnitsQuery.every((bu) => businessUnitScopes.includes(bu as unknown as BusinessUnit))) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        } else if (metadata.metatype?.name === CreateJumpointNodeDtoInput.name) {
            const dto = value as CreateJumpointNodeDtoInput;

            // Validate business unit scope when creating with a specific business unit.
            if (dto.businessUnit && !businessUnitScopes.includes(dto.businessUnit as unknown as BusinessUnit)) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing jumpoint node ID parameter');
            }

            const jumpointNode = await this.queryBus.execute<RetrieveJumpointNodeByIdQuery, JumpointNode>(
                new RetrieveJumpointNodeByIdQuery(transactionId, requestParamId),
            );

            if (
                jumpointNode &&
                jumpointNode.businessUnit &&
                !businessUnitScopes.includes(jumpointNode.businessUnit as unknown as BusinessUnit)
            ) {
                throw new ForbiddenException('Forbidden business unit access');
            }
        }

        return value;
    }
}
