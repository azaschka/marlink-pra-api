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
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../../core/decorators';
import { NonEmptyBodyPipe } from '../../../shared/pipes';
import { UuidUtility } from '../../../shared/utilities';
import {
    CopyShellJumpCommand,
    CreateShellJumpCommand,
    DeleteShellJumpCommand,
    ModifyShellJumpCommand,
} from '../commands';
import {
    CopyShellJumpDtoInput,
    CreateShellJumpDtoInput,
    ModifyShellJumpDtoInput,
    RetrieveShellJumpsDtoInput,
} from '../dtos/inputs';
import {
    ShellJumpCopiedDtoOutput,
    ShellJumpCreatedDtoOutput,
    ShellJumpModifiedDtoOutput,
    ShellJumpRetrievedDtoOutput,
} from '../dtos/outputs';
import { ShellJump } from '../models';
import { RetrieveShellJumpsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Jump Items')
@Controller('jump-items/shell-jumps')
@UsePipes(new ValidationPipe({ transform: true }))
export class ShellJumpController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: ShellJumpRetrievedDtoOutput, isArray: true })
    public async retrieveShellJumps(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveShellJumpsDtoInput,
    ): Promise<ShellJumpRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveShellJumpsQuery, ShellJump[]>(
            new RetrieveShellJumpsQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.hostname,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.jumpointId,
                dtoInput.tag,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({ type: ShellJumpCreatedDtoOutput })
    public async createShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateShellJumpDtoInput,
    ): Promise<ShellJumpCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateShellJumpCommand, ShellJump>(
            new CreateShellJumpCommand(
                transactionId,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.protocolType,
                dtoInput.port,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.terminalType,
                dtoInput.keepAliveIdleSessionInSeconds,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.username,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiOkResponse({ type: ShellJumpModifiedDtoOutput })
    public async modifyShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyShellJumpDtoInput,
    ): Promise<ShellJumpModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyShellJumpCommand, ShellJump>(
            new ModifyShellJumpCommand(
                transactionId,
                id,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.protocolType,
                dtoInput.port,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.terminalType,
                dtoInput.keepAliveIdleSessionInSeconds,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.username,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @HttpCode(HttpStatus.NO_CONTENT)
    public async deleteShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteShellJumpCommand, void>(new DeleteShellJumpCommand(transactionId, id));
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: ShellJumpCopiedDtoOutput })
    @HttpCode(HttpStatus.OK)
    public async copyShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: CopyShellJumpDtoInput,
    ): Promise<ShellJumpCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyShellJumpCommand, ShellJump>(
            new CopyShellJumpCommand(transactionId, id, dtoInput.jumpGroupId, dtoInput.jumpGroupType, dtoInput.name),
        );

        return result;
    }
}
