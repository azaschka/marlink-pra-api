import { Body, Controller, Get, Param, Patch, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiParam, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import { AppConfigService } from '../../app-config/services/app-config.service';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { ModifyUserGroupPoliciesCommand } from '../commands';
import { ModifyUserGroupPoliciesDtoInput, RetrieveUserGroupPoliciesDtoInput } from '../dtos/inputs';
import { UserGroupPolicyModifiedDtoOutput, UserGroupPolicyRetrievedDtoOutput } from '../dtos/outputs';
import { UserGroupPolicy } from '../models';
import { RetrieveUserGroupPoliciesQuery } from '../queries';
import { UserGroupPolicyMembershipWorkflow } from '../../group-policy-member/workflows';
import { User } from '../../user/models';
import { RetrieveUserByIdQuery } from '../../user/queries';
import { UserSourceUtility } from '../../user/utilities';
import { NonLocalGroupPolicyChangeFailedException } from '../exceptions';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Users')
@Controller('users')
@UseGuards(AccessGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class UserGroupPolicyController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly appConfigService: AppConfigService,
    ) {}

    @Get(':id/group-policies')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: UserGroupPolicyRetrievedDtoOutput,
        isArray: true,
        description: 'Returns the group policies associated with the user.',
    })
    public async retrieveUserGroupPolicies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Query() dtoInput: RetrieveUserGroupPoliciesDtoInput,
    ): Promise<UserGroupPolicyRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveUserGroupPoliciesQuery, UserGroupPolicyRetrievedDtoOutput[]>(
            new RetrieveUserGroupPoliciesQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                id,
                dtoInput.groupPolicyNamePatterns,
            ),
        );

        return result;
    }

    @Patch(':id/group-policies')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: UserGroupPolicyModifiedDtoOutput,
        isArray: true,
        description: 'Indicates the user was added or removed successfully from the group policies.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyUserGroupPolicies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyUserGroupPoliciesDtoInput,
    ): Promise<UserGroupPolicyModifiedDtoOutput[]> {
        const user = await this.queryBus.execute<RetrieveUserByIdQuery, User>(
            new RetrieveUserByIdQuery(transactionId, tenantId, id),
        );

        // EXT-04 (R3.2-A004): the local-user endpoint behind ModifyUserGroupPoliciesCommand rejects non-local users,
        // so their memberships are changed one group policy at a time through the member endpoints.
        if (UserSourceUtility.isExternal(user, this.appConfigService.user.localSecurityProviderIds)) {
            return await this.modifyNonLocalUserGroupPolicies(
                transactionId,
                tenantId,
                user,
                dtoInput.groupPolicyIdsToAdd ?? [],
                dtoInput.groupPolicyIdsToRemove ?? [],
            );
        }

        const result = await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.groupPolicyIdsToAdd,
                dtoInput.groupPolicyIdsToRemove,
            ),
        );

        return result;
    }

    /**
     * Returns the group policies the user is now a direct member of among the requested additions. BeyondTrust
     * reports the change in the user's group policy list only after the next synchronisation.
     *
     * @throws NonLocalGroupPolicyChangeFailedException if one or more changes could not be applied
     */
    private async modifyNonLocalUserGroupPolicies(
        transactionId: string,
        tenantId: number,
        user: User,
        groupPolicyIdsToAdd: number[],
        groupPolicyIdsToRemove: number[],
    ): Promise<UserGroupPolicyModifiedDtoOutput[]> {
        const outcome = await new UserGroupPolicyMembershipWorkflow(
            this.queryBus,
            this.commandBus,
            transactionId,
            tenantId,
        ).apply(user, groupPolicyIdsToAdd, groupPolicyIdsToRemove);

        if (outcome.failures.length > 0) {
            throw new NonLocalGroupPolicyChangeFailedException(user.id, outcome.failures);
        }

        const now = new Date();

        return outcome.addedGroupPolicyIds.map((groupPolicyId) => ({
            userId: user.id,
            groupPolicyId: groupPolicyId,
            lastSyncDate: now,
        })) as UserGroupPolicyModifiedDtoOutput[];
    }
}
