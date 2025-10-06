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
import { ApiTenantIdHeader, ApiTransactionIdHeader, TenantIdHeader, TransactionIdHeader } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { AddTeamToGroupPolicyCommand, RemoveTeamFromGroupPolicyCommand } from '../commands';
import { AddTeamToGroupPolicyDtoInput, RetrieveGroupPolicyTeamsDtoInput } from '../dtos/inputs';
import { GroupPolicyTeamAddedDtoOutput, GroupPolicyTeamRetrievedDtoOutput } from '../dtos/outputs';
import { GroupPolicyTeam } from '../models';
import { RetrieveGroupPolicyTeamsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyTeamController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id/teams')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: GroupPolicyTeamRetrievedDtoOutput,
        isArray: true,
        description: 'Returns the teams associated with the group policy.',
    })
    public async retrieveGroupPolicyTeams(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Query() dtoInput: RetrieveGroupPolicyTeamsDtoInput,
    ): Promise<GroupPolicyTeamRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveGroupPolicyTeamsQuery, GroupPolicyTeamRetrievedDtoOutput[]>(
            new RetrieveGroupPolicyTeamsQuery(transactionId, tenantId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }

    @Post(':id/teams')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: GroupPolicyTeamAddedDtoOutput,
        description: 'Indicates that the Team was successfully added.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async addTeamToGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: AddTeamToGroupPolicyDtoInput,
    ): Promise<GroupPolicyTeamAddedDtoOutput> {
        const result = await this.commandBus.execute<AddTeamToGroupPolicyCommand, GroupPolicyTeam>(
            new AddTeamToGroupPolicyCommand(transactionId, tenantId, id, dtoInput.teamId, dtoInput.roleType),
        );

        return result;
    }

    @Delete(':id/teams/:teamId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({
        name: 'teamId',
        type: Number,
        required: true,
        description: 'Unique identifier for the Team.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Team was successfully removed.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeTeamFromGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Param('teamId') teamId: number,
    ): Promise<void> {
        await this.commandBus.execute(new RemoveTeamFromGroupPolicyCommand(transactionId, tenantId, id, teamId));
    }
}
