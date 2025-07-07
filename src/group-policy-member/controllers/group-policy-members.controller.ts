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
import { AddMemberToGroupPolicyCommand, RemoveMemberFromGroupPolicyCommand } from '../commands';
import { AddMemberToGroupPolicyDtoInput } from '../dtos/inputs';
import { GroupPolicyMemberAddedDtoOutput } from '../dtos/outputs';
import { GroupPolicyMember } from '../models';

@ApiTransactionIdHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyMembersController {
    constructor(private readonly commandBus: CommandBus) {}

    @Post(':id/members')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: GroupPolicyMemberAddedDtoOutput,
        description: 'Indicates that the Member was successfully added.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async addMemberToGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: AddMemberToGroupPolicyDtoInput,
    ): Promise<GroupPolicyMemberAddedDtoOutput> {
        const result = await this.commandBus.execute<AddMemberToGroupPolicyCommand, GroupPolicyMember>(
            new AddMemberToGroupPolicyCommand(
                transactionId,
                id,
                dtoInput.userId,
                dtoInput.securityProviderId,
                dtoInput.distinguishedName,
                dtoInput.groupName,
            ),
        );

        return result;
    }

    @Delete(':id/members/:memberId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({
        name: 'memberId',
        type: Number,
        required: true,
        description: 'Unique identifier for the Member.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Member was successfully removed.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeMemberFromGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Param('memberId') memberId: number,
    ): Promise<void> {
        await this.commandBus.execute(new RemoveMemberFromGroupPolicyCommand(transactionId, id, memberId));
    }
}
