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
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../core/decorators';
import { Customer } from '../../customer/models';
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { CreateTeamDtoInput, RetrieveTeamsDtoInput } from '../dtos/inputs';
import { Team } from '../models';
import { RetrieveTeamByIdQuery } from '../queries';

@Injectable()
export class TeamRequestPipe implements PipeTransform {
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
        const customerScopeNames = customerScopes.map((c) => c.name);
        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const tenantId = this.request.headers[TENANT_ID_HEADER.toLowerCase()] as unknown as number;

        if (metadata.metatype?.name === RetrieveTeamsDtoInput.name) {
            const { namePatterns, name: nameQuery } = this.request.query as {
                namePatterns: string | string[] | undefined;
                name: string | undefined;
            };

            const namePatternsQuery = ObjectUtility.convertToArray<string | undefined>(namePatterns)
                .filter((pattern) => pattern !== undefined)
                .map((pattern) => pattern.replace(/%/g, '')); // Remove % for comparison

            if (namePatternsQuery.length === 0 && !nameQuery) {
                const dto = value as RetrieveTeamsDtoInput;

                // If no name patterns are queried, set to scoped customer names
                dto.namePatterns = customerScopes.map((c) => `%${c.name}%`);
            }

            if (nameQuery && !ObjectUtility.doesEveryTargetContainSourceSubstring([nameQuery], customerScopeNames)) {
                throw new ForbiddenException('Forbidden customer access');
            }

            if (
                namePatternsQuery.length > 0 &&
                !ObjectUtility.doesEveryTargetContainSourceSubstring(namePatternsQuery, customerScopeNames)
            ) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else if (metadata.metatype?.name === CreateTeamDtoInput.name) {
            const dto = value as CreateTeamDtoInput;

            // Validate team name in the body explicitly exists in customer scopes
            if (!ObjectUtility.doesEveryTargetContainSourceSubstring([dto.name], customerScopeNames)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing team ID parameter');
            }

            const team = await this.queryBus.execute<RetrieveTeamByIdQuery, Team>(
                new RetrieveTeamByIdQuery(transactionId, tenantId, requestParamId),
            );

            if (!ObjectUtility.doesEveryTargetContainSourceSubstring([team.name], customerScopeNames)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
