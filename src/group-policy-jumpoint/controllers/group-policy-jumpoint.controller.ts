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
import { UuidUtility } from '../../shared/utilities';
import { AddJumpointToGroupPolicyCommand, RemoveJumpointFromGroupPolicyCommand } from '../commands';
import { AddJumpointToGroupPolicyDtoInput, RetrieveGroupPolicyJumpointsDtoInput } from '../dtos/inputs';
import { GroupPolicyJumpointAddedDtoOutput, GroupPolicyJumpointRetrievedDtoOutput } from '../dtos/outputs';
import { GroupPolicyJumpoint } from '../models';
import { RetrieveGroupPolicyJumpointsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(GroupPolicyRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyJumpointController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id/jumpoints')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: GroupPolicyJumpointRetrievedDtoOutput,
        isArray: true,
        description: 'Returns the jumpoints associated with the group policy.',
    })
    public async retrieveGroupPolicyJumpoints(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Query() dtoInput: RetrieveGroupPolicyJumpointsDtoInput,
    ): Promise<GroupPolicyJumpointRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<
            RetrieveGroupPolicyJumpointsQuery,
            GroupPolicyJumpointRetrievedDtoOutput[]
        >(new RetrieveGroupPolicyJumpointsQuery(transactionId, tenantId, dtoInput.pageSize, dtoInput.pageNumber, id));

        return result;
    }

    @Post(':id/jumpoints')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: GroupPolicyJumpointAddedDtoOutput,
        description: 'Indicates that the Jumpoint was successfully added.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async addJumpointToGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: AddJumpointToGroupPolicyDtoInput,
    ): Promise<GroupPolicyJumpointAddedDtoOutput> {
        const result = await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
            new AddJumpointToGroupPolicyCommand(transactionId, tenantId, id, dtoInput.jumpointId),
        );

        return result;
    }

    @Delete(':id/jumpoints/:jumpointId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({ name: 'jumpointId', type: Number, required: true, description: 'Unique identifier for the Jumpoint.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Jumpoint was successfully removed.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeJumpointFromGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Param('jumpointId') jumpointId: number,
    ): Promise<void> {
        await this.commandBus.execute(
            new RemoveJumpointFromGroupPolicyCommand(transactionId, tenantId, id, jumpointId),
        );
    }
}
