import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { AddTeamToGroupPolicyCommand, RemoveTeamFromGroupPolicyCommand } from '../commands';
import { AddTeamToGroupPolicyDtoInput } from '../dtos/inputs';
import { GroupPolicyTeamAddedDtoOutput } from '../dtos/outputs';
import { GroupPolicyTeam } from '../models';

@ApiTransactionIdHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyTeamsController {
    constructor(private readonly commandBus: CommandBus) {}

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
        @Param('id') id: number,
        @Body() dtoInput: AddTeamToGroupPolicyDtoInput,
    ): Promise<GroupPolicyTeamAddedDtoOutput> {
        const result = await this.commandBus.execute<AddTeamToGroupPolicyCommand, GroupPolicyTeam>(
            new AddTeamToGroupPolicyCommand(transactionId, id, dtoInput.teamId, dtoInput.roleType),
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
        @Param('id') id: number,
        @Param('teamId') teamId: number,
    ): Promise<void> {
        await this.commandBus.execute(new RemoveTeamFromGroupPolicyCommand(transactionId, id, teamId));
    }
}
