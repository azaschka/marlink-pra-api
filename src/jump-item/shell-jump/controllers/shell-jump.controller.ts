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
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../../core/decorators';
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

@ApiTenantIdHeader()
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
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveShellJumpsDtoInput,
    ): Promise<ShellJumpRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveShellJumpsQuery, ShellJumpRetrievedDtoOutput[]>(
            new RetrieveShellJumpsQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.hostname,
                dtoInput.jumpGroupIds,
                dtoInput.jumpGroupType,
                dtoInput.jumpointId,
                dtoInput.tag,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: ShellJumpCreatedDtoOutput,
        description:
            'Indicates the Shell Jump Item was created successfully and contains the new Shell Jump Item instance.',
    })
    @ApiConflictResponse({
        description: 'A Shell Jump Item already exists.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateShellJumpDtoInput,
    ): Promise<ShellJumpCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateShellJumpCommand, ShellJump>(
            new CreateShellJumpCommand(
                transactionId,
                tenantId,
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
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: ShellJumpModifiedDtoOutput,
        description: 'Indicates the existing Shell Jump was successfully updated and returns the Shell Jump.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyShellJumpDtoInput,
    ): Promise<ShellJumpModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyShellJumpCommand, ShellJump>(
            new ModifyShellJumpCommand(
                transactionId,
                tenantId,
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
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Shell Jump was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteShellJumpCommand, void>(
            new DeleteShellJumpCommand(transactionId, tenantId, id),
        );
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: ShellJumpCopiedDtoOutput,
        description: 'Indicates the Shell Jump was successfully copied.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async copyShellJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: CopyShellJumpDtoInput,
    ): Promise<ShellJumpCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyShellJumpCommand, ShellJump>(
            new CopyShellJumpCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.name,
            ),
        );

        return result;
    }
}
