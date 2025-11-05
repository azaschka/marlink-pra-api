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
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { JumpGroup } from '../../../jump-group/models';
import { ObjectUtility, UuidUtility } from '../../../shared/utilities';
import { CreateShellJumpDtoInput, RetrieveShellJumpsDtoInput } from '../dtos/inputs';
import { ShellJump } from '../models';
import { RetrieveShellJumpByIdQuery } from '../queries';

@Injectable()
export class ShellJumpRequestPipe implements PipeTransform {
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
        const jumpGroupScopes = this.request['jumpGroups'] as JumpGroup[];
        const jumpGroupScopeIds = jumpGroupScopes.map((c) => c.id);
        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const tenantId = this.request.headers[TENANT_ID_HEADER.toLowerCase()] as unknown as number;

        if (metadata.metatype?.name === RetrieveShellJumpsDtoInput.name) {
            const { jumpGroupIds } = this.request.query as {
                jumpGroupIds: number | number[] | undefined;
            };

            const jumpGroupIdsQuery = ObjectUtility.convertToArray<number | undefined>(jumpGroupIds).filter(
                (id) => id !== undefined,
            );

            if (jumpGroupIdsQuery.length === 0) {
                const dto = value as RetrieveShellJumpsDtoInput;

                // If no jump group IDs are queried, set to scoped jump group IDs
                dto.jumpGroupIds = jumpGroupScopeIds;
            }

            if (jumpGroupIdsQuery.length > 0 && !jumpGroupIdsQuery.every((id) => jumpGroupScopeIds.includes(id))) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else if (metadata.metatype?.name === CreateShellJumpDtoInput.name) {
            const dto = value as CreateShellJumpDtoInput;

            if (!jumpGroupScopeIds.includes(dto.jumpGroupId)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing shell jump ID parameter');
            }

            const shellJump = await this.queryBus.execute<RetrieveShellJumpByIdQuery, ShellJump>(
                new RetrieveShellJumpByIdQuery(transactionId, tenantId, requestParamId),
            );

            if (!jumpGroupScopeIds.includes(shellJump.jumpGroupId)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
