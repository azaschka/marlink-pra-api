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
import { CreateProtocolTunnelJumpDtoInput, RetrieveProtocolTunnelJumpsDtoInput } from '../dtos/inputs';
import { ProtocolTunnelJump } from '../models';
import { RetrieveProtocolTunnelJumpByIdQuery } from '../queries';

@Injectable()
export class ProtocolTunnelJumpRequestPipe implements PipeTransform {
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

        if (metadata.metatype?.name === RetrieveProtocolTunnelJumpsDtoInput.name) {
            const { jumpGroupIds } = this.request.query as {
                jumpGroupIds: number | number[] | undefined;
            };

            const jumpGroupIdsQuery = ObjectUtility.convertToArray<number | undefined>(jumpGroupIds).filter(
                (id) => id !== undefined,
            );

            if (jumpGroupIdsQuery.length === 0) {
                const dto = value as RetrieveProtocolTunnelJumpsDtoInput;

                // If no jump group IDs are queried, set to scoped jump group IDs
                dto.jumpGroupIds = jumpGroupScopeIds;
            }

            if (jumpGroupIdsQuery.length > 0 && !jumpGroupIdsQuery.every((id) => jumpGroupScopeIds.includes(id))) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else if (metadata.metatype?.name === CreateProtocolTunnelJumpDtoInput.name) {
            const dto = value as CreateProtocolTunnelJumpDtoInput;

            if (!jumpGroupScopeIds.includes(dto.jumpGroupId)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing protocol tunnel jump ID parameter');
            }

            const protocolTunnelJump = await this.queryBus.execute<
                RetrieveProtocolTunnelJumpByIdQuery,
                ProtocolTunnelJump
            >(new RetrieveProtocolTunnelJumpByIdQuery(transactionId, tenantId, requestParamId));

            if (!jumpGroupScopeIds.includes(protocolTunnelJump.jumpGroupId)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
