import { ArgumentMetadata, ForbiddenException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { RetrieveUserGroupPoliciesDtoInput } from '../dtos/inputs';

@Injectable()
export class UserGroupPolicyRequestPipe implements PipeTransform {
    constructor(
        @Inject(REQUEST) private readonly request: Request,
        private readonly appConfigService: AppConfigService,
    ) {}

    public transform(value: unknown, metadata: ArgumentMetadata) {
        const universalGroupPolicies = [
            this.appConfigService.site.groupPolicy.fullAccess,
            this.appConfigService.site.groupPolicy.limitedAccess,
            this.appConfigService.site.groupPolicy.marlink.operator,
        ];

        // Skip if this isn't an HTTP request body, query, param.
        if (metadata.type !== 'query' && metadata.type !== 'body' && metadata.type !== 'param') {
            return value;
        }

        if (!this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()]) {
            this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] = UuidUtility.generate();
        }

        const customerScopes = this.request.customers!;
        const groupPolicyScopeNames = customerScopes.map((c) => c.name).concat(universalGroupPolicies);

        if (metadata.metatype?.name === RetrieveUserGroupPoliciesDtoInput.name) {
            const { groupPolicyNamePatterns } = this.request.query as {
                groupPolicyNamePatterns: string | string[] | undefined;
            };

            const groupPolicyNamePatternsQuery = ObjectUtility.convertToArray<string | undefined>(
                groupPolicyNamePatterns,
            )
                .filter((pattern) => pattern !== undefined)
                .map((pattern) => pattern.replace(/%/g, '')); // Remove % for comparison

            if (groupPolicyNamePatternsQuery.length === 0) {
                const dto = value as RetrieveUserGroupPoliciesDtoInput;

                // If no name patterns are queried, set to scoped group policy names
                dto.groupPolicyNamePatterns = groupPolicyScopeNames.map((name) => `%${name}%`);
            }

            if (
                groupPolicyNamePatternsQuery.length > 0 &&
                !ObjectUtility.doesEveryTargetContainSourceSubstring(
                    groupPolicyNamePatternsQuery,
                    groupPolicyScopeNames,
                )
            ) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
