import { Body, Controller, Get, Param, Patch, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiParam, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
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
}
