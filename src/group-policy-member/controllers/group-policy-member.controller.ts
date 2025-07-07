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
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { AddMemberToGroupPolicyCommand, RemoveMemberFromGroupPolicyCommand } from '../commands';
import { AddMemberToGroupPolicyDtoInput, RetrieveGroupPolicyMembersDtoInput } from '../dtos/inputs';
import { GroupPolicyMemberAddedDtoOutput, GroupPolicyMemberRetrievedDtoOutput } from '../dtos/outputs';
import { GroupPolicyMember } from '../models';
import { RetrieveGroupPolicyMembersQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyMemberController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id/members')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: GroupPolicyMemberRetrievedDtoOutput,
        isArray: true,
        description: 'Returns the members associated with the group policy.',
    })
    public async retrieveGroupPolicyMembers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Query() dtoInput: RetrieveGroupPolicyMembersDtoInput,
    ): Promise<GroupPolicyMemberRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<
            RetrieveGroupPolicyMembersQuery,
            GroupPolicyMemberRetrievedDtoOutput[]
        >(new RetrieveGroupPolicyMembersQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id));

        return result;
    }

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
