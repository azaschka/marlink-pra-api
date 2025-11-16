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
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { CreateUserDtoInput, RetrieveUsersDtoInput } from '../dtos/inputs';
import { User } from '../models';
import { RetrieveUserByIdQuery } from '../queries';

@Injectable()
export class UserRequestPipe implements PipeTransform {
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
        const customerScopes = this.request.customers;

        if (!customerScopes || customerScopes.length === 0) {
            console.error(`[${transactionId}] UserRequestPipe: No customer scopes found in request`);
            throw new ForbiddenException('No customer scopes available for validation');
        }

        const customerScopeNames = customerScopes.map((c) => c.name);
        const tenantId = this.request.headers[TENANT_ID_HEADER.toLowerCase()] as unknown as number;

        if (metadata.metatype?.name === RetrieveUsersDtoInput.name) {
            const { publicDisplayNamePatterns } = this.request.query as {
                publicDisplayNamePatterns: string | string[] | undefined;
            };

            const publicDisplayNamePatternsQuery = ObjectUtility.convertToArray<string | undefined>(
                publicDisplayNamePatterns,
            )
                .filter((pattern) => pattern !== undefined)
                .map((pattern) => pattern.replace(/%/g, '')); // Remove % for comparison

            if (publicDisplayNamePatternsQuery.length === 0) {
                const dto = value as RetrieveUsersDtoInput;

                // If no name patterns are queried, set to scoped customer names
                dto.publicDisplayNamePatterns = customerScopes.map((c) => `%${c.name}%`);
            }

            if (
                publicDisplayNamePatternsQuery.length > 0 &&
                !ObjectUtility.doesEveryTargetContainSourceSubstring(publicDisplayNamePatternsQuery, customerScopeNames)
            ) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else if (metadata.metatype?.name === CreateUserDtoInput.name) {
            const dto = value as CreateUserDtoInput;

            // Validate user public display name in the body explicitly exists in customer scopes
            if (!ObjectUtility.doesEveryTargetContainSourceSubstring([dto.publicDisplayName], customerScopeNames)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing user ID parameter');
            }

            const user = await this.queryBus.execute<RetrieveUserByIdQuery, User>(
                new RetrieveUserByIdQuery(transactionId, tenantId, requestParamId),
            );

            if (!ObjectUtility.doesEveryTargetContainSourceSubstring([user.publicDisplayName], customerScopeNames)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
