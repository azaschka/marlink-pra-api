import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { GroupPolicyRequestPipe } from '../../group-policy/pipes';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { UuidUtility } from '../../shared/utilities';
import { AddJumpGroupToGroupPolicyCommand, RemoveJumpGroupFromGroupPolicyCommand } from '../commands';
import { AddJumpGroupToGroupPolicyDtoInput, RetrieveGroupPolicyJumpGroupsDtoInput } from '../dtos/inputs';
import { GroupPolicyJumpGroupAddedDtoOutput, GroupPolicyJumpGroupRetrievedDtoOutput } from '../dtos/outputs';
import { GroupPolicyJumpGroup } from '../models';
import { RetrieveGroupPolicyJumpGroupsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(GroupPolicyRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyJumpGroupController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id/jump-groups')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: GroupPolicyJumpGroupRetrievedDtoOutput,
        isArray: true,
        description: 'Returns the jump groups associated with the group policy.',
    })
    public async retrieveGroupPolicyJumpGroups(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Query() dtoInput: RetrieveGroupPolicyJumpGroupsDtoInput,
    ): Promise<GroupPolicyJumpGroupRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<
            RetrieveGroupPolicyJumpGroupsQuery,
            GroupPolicyJumpGroupRetrievedDtoOutput[]
        >(new RetrieveGroupPolicyJumpGroupsQuery(transactionId, tenantId, dtoInput.pageSize, dtoInput.pageNumber, id));

        return result;
    }

    @Post(':id/jump-groups')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: GroupPolicyJumpGroupAddedDtoOutput,
        description: 'Indicates that the Jump Group was successfully added.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async addJumpGroupToGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: AddJumpGroupToGroupPolicyDtoInput,
    ): Promise<GroupPolicyJumpGroupAddedDtoOutput> {
        const result = await this.commandBus.execute<AddJumpGroupToGroupPolicyCommand, GroupPolicyJumpGroup>(
            new AddJumpGroupToGroupPolicyCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.jumpGroupId,
                dtoInput.jumpItemRoleId,
                dtoInput.jumpPolicyId,
            ),
        );

        return result;
    }

    @Delete(':id/jump-groups/:jumpGroupId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({
        name: 'jumpGroupId',
        type: Number,
        required: true,
        description: 'Unique identifier for the Jump Group.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Jump Group was successfully removed.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeJumpGroupFromGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Param('jumpGroupId') jumpGroupId: number,
    ): Promise<void> {
        await this.commandBus.execute(
            new RemoveJumpGroupFromGroupPolicyCommand(transactionId, tenantId, id, jumpGroupId),
        );
    }
}
