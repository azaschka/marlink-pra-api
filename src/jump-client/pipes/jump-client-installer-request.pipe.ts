import {
    ArgumentMetadata,
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
    PipeTransform,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../core/decorators';
import { ObjectUtility, UuidUtility } from '../../shared/utilities';
import { CreateJumpClientInstallerDtoInput, RetrieveJumpClientInstallersDtoInput } from '../dtos/inputs';
import { JumpClientInstaller } from '../models';
import { RetrieveJumpClientInstallerByIdQuery, RetrieveJumpClientInstallersQuery } from '../queries';

@Injectable()
export class JumpClientInstallerRequestPipe implements PipeTransform {
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

        const jumpGroupScopes = this.request.jumpGroups!;
        const jumpGroupScopeIds = jumpGroupScopes.map((c) => c.id);
        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;
        const tenantId = this.request.headers[TENANT_ID_HEADER.toLowerCase()] as unknown as number;

        if (metadata.metatype?.name === RetrieveJumpClientInstallersDtoInput.name) {
            const { jumpGroupIds } = this.request.query as {
                jumpGroupIds: number | number[] | undefined;
            };

            const jumpGroupIdsQuery = ObjectUtility.convertToArray<number | undefined>(jumpGroupIds).filter(
                (id) => id !== undefined,
            );

            if (jumpGroupIdsQuery.length === 0) {
                const dto = value as RetrieveJumpClientInstallersDtoInput;

                // If no jump group IDs are queried, set to scoped jump group IDs
                dto.jumpGroupIds = jumpGroupScopeIds;
            }

            if (jumpGroupIdsQuery.length > 0 && !jumpGroupIdsQuery.every((id) => jumpGroupScopeIds.includes(id))) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else if (metadata.metatype?.name === CreateJumpClientInstallerDtoInput.name) {
            const dto = value as CreateJumpClientInstallerDtoInput;

            if (!jumpGroupScopeIds.includes(dto.jumpGroupId)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else if (this.request.params['installerId']) {
            const rawInstallerId = this.request.params['installerId'];
            const requestParamInstallerId = (
                Array.isArray(rawInstallerId) ? rawInstallerId[0] : rawInstallerId
            ) as string;

            const jumpClientInstaller = (
                await this.queryBus.execute<RetrieveJumpClientInstallersQuery, JumpClientInstaller[]>(
                    new RetrieveJumpClientInstallersQuery(
                        transactionId,
                        tenantId,
                        1,
                        1,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        requestParamInstallerId,
                    ),
                )
            )[0];

            if (!jumpClientInstaller) {
                throw new NotFoundException(
                    `Jump client installer with installer id '${requestParamInstallerId}' is not found`,
                );
            }

            if (!jumpGroupScopeIds.includes(jumpClientInstaller.jumpGroupId)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        } else {
            const requestParamId = Number(this.request.params['id']);

            if (!requestParamId) {
                throw new BadRequestException('Missing jump client installer ID parameter');
            }

            const jumpClientInstaller = await this.queryBus.execute<
                RetrieveJumpClientInstallerByIdQuery,
                JumpClientInstaller
            >(new RetrieveJumpClientInstallerByIdQuery(transactionId, tenantId, requestParamId));

            if (!jumpGroupScopeIds.includes(jumpClientInstaller.jumpGroupId)) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
