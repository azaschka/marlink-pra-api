import { ArgumentMetadata, ForbiddenException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { RetrieveSessionPoliciesDtoInput } from '../dtos/inputs';

@Injectable()
export class SessionPolicyRequestPipe implements PipeTransform {
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
        const sessionPolicyCodeNameBusinessUnitPatterns = customerScopeBusinessUnits.map((bu) => `${bu}_`);

        if (metadata.metatype?.name === RetrieveSessionPoliciesDtoInput.name) {
            const { codeNamePatterns, codeName: codeNameQuery } = this.request.query as {
                codeNamePatterns: string | string[] | undefined;
                codeName: string | undefined;
            };

            const codeNamePatternsQuery = ObjectUtility.convertToArray<string | undefined>(codeNamePatterns)
                .filter((pattern) => pattern !== undefined)
                .map((pattern) => pattern.replace(/%/g, '')); // Remove % for comparison

            if (codeNamePatternsQuery.length === 0 && !codeNameQuery) {
                const dto = value as RetrieveSessionPoliciesDtoInput;

                // If no code name patterns are queried, set to scoped customer's business units
                dto.codeNamePatterns = customerScopes.map((c) => `${c.businessUnit}_%`);
            }

            if (
                codeNameQuery &&
                !ObjectUtility.doesEveryTargetContainSourceSubstring(
                    [codeNameQuery],
                    sessionPolicyCodeNameBusinessUnitPatterns,
                )
            ) {
                throw new ForbiddenException('Forbidden customer access');
            }

            if (
                codeNamePatternsQuery.length > 0 &&
                !ObjectUtility.doesEveryTargetContainSourceSubstring(
                    codeNamePatternsQuery,
                    sessionPolicyCodeNameBusinessUnitPatterns,
                )
            ) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
