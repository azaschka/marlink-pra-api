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
import { AddJumpointToGroupPolicyCommand, RemoveJumpointFromGroupPolicyCommand } from '../commands';
import { AddJumpointToGroupPolicyDtoInput } from '../dtos/inputs';
import { GroupPolicyJumpointAddedDtoOutput } from '../dtos/outputs';
import { GroupPolicyJumpoint } from '../models';

@ApiTransactionIdHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyJumpointsController {
    constructor(private readonly commandBus: CommandBus) {}

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
        @Param('id') id: number,
        @Body() dtoInput: AddJumpointToGroupPolicyDtoInput,
    ): Promise<GroupPolicyJumpointAddedDtoOutput> {
        const result = await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
            new AddJumpointToGroupPolicyCommand(transactionId, id, dtoInput.jumpointId),
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
        @Param('id') id: number,
        @Param('jumpointId') jumpointId: number,
    ): Promise<void> {
        await this.commandBus.execute(new RemoveJumpointFromGroupPolicyCommand(transactionId, id, jumpointId));
    }
}
