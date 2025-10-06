import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiTenantIdHeader, ApiTransactionIdHeader, TenantIdHeader, TransactionIdHeader } from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CreateJumpGroupCommand, DeleteJumpGroupCommand, ModifyJumpGroupCommand } from '../commands';
import { CreateJumpGroupDtoInput, ModifyJumpGroupDtoInput, RetrieveJumpGroupsDtoInput } from '../dtos/inputs';
import { JumpGroupCreatedDtoOutput, JumpGroupModifiedDtoOutput, JumpGroupRetrievedDtoOutput } from '../dtos/outputs';
import { JumpGroup } from '../models';
import { RetrieveJumpGroupsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiTags('Jump Groups')
@Controller('jump-groups')
@UsePipes(new ValidationPipe({ transform: true }))
export class JumpGroupController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: JumpGroupRetrievedDtoOutput, isArray: true })
    public async retrieveJumpGroups(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveJumpGroupsDtoInput,
    ): Promise<JumpGroupRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveJumpGroupsQuery, JumpGroup[]>(
            new RetrieveJumpGroupsQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.codeName,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({ type: JumpGroupCreatedDtoOutput })
    public async createJumpGroup(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateJumpGroupDtoInput,
    ): Promise<JumpGroupCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateJumpGroupCommand, JumpGroup>(
            new CreateJumpGroupCommand(transactionId, tenantId, dtoInput.name, dtoInput.codeName, dtoInput.comments),
        );

        return result;
    }

    @Patch(':id')
    @ApiOkResponse({ type: JumpGroupModifiedDtoOutput })
    public async modifyJumpGroup(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyJumpGroupDtoInput,
    ): Promise<JumpGroupModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyJumpGroupCommand, JumpGroup>(
            new ModifyJumpGroupCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.name,
                dtoInput.codeName,
                dtoInput.comments,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @HttpCode(HttpStatus.NO_CONTENT)
    public async deleteJumpGroup(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteJumpGroupCommand, void>(
            new DeleteJumpGroupCommand(transactionId, tenantId, id),
        );
    }
}
