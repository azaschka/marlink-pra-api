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
import { CreateJumpPolicyDtoInput, RetrieveJumpPoliciesDtoInput } from '../dtos/inputs';
import { JumpPolicy } from '../models';
import { RetrieveJumpPolicyByIdQuery } from '../queries';

@Injectable()
export class JumpPolicyRequestPipe implements PipeTransform {
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

        if (metadata.metatype?.name === RetrieveJumpPoliciesDtoInput.name) {
            const { displayNamePatterns } = this.request.query as {
                displayNamePatterns: string | string[] | undefined;
            };

            const displayNamePatternsQuery = ObjectUtility.convertToArray<string | undefined>(displayNamePatterns)
                .filter((pattern) => pattern !== undefined)
                .map((pattern) => pattern.replace(/%/g, '')); // Remove % for comparison

            if (displayNamePatternsQuery.length === 0) {
                const dto = value as RetrieveJumpPoliciesDtoInput;

                // If no name patterns are queried, set to scoped customer names
                dto.displayNamePatterns = customerScopes.map((c) => `%${c.name}%`);
            }

            if (
                displayNamePatternsQuery.length > 0 &&
                !ObjectUtility.doesEveryTargetContainSourceSubstring(displayNamePatternsQuery, customerScopeNames)
            ) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else if (metadata.metatype?.name === CreateJumpPolicyDtoInput.name) {
            const dto = value as CreateJumpPolicyDtoInput;

            // Validate jump policy name in the body explicitly exists in customer scopes
            if (!ObjectUtility.doesEveryTargetContainSourceSubstring([dto.displayName], customerScopeNames)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing jump policy ID parameter');
            }

            const jumpPolicy = await this.queryBus.execute<RetrieveJumpPolicyByIdQuery, JumpPolicy>(
                new RetrieveJumpPolicyByIdQuery(transactionId, tenantId, requestParamId),
            );

            if (!ObjectUtility.doesEveryTargetContainSourceSubstring([jumpPolicy.displayName], customerScopeNames)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
