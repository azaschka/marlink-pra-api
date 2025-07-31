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
import { CopyWebJumpCommand, CreateWebJumpCommand, DeleteWebJumpCommand, ModifyWebJumpCommand } from '../commands';
import {
    CopyWebJumpDtoInput,
    CreateWebJumpDtoInput,
    ModifyWebJumpDtoInput,
    RetrieveWebJumpsDtoInput,
} from '../dtos/inputs';
import {
    WebJumpCopiedDtoOutput,
    WebJumpCreatedDtoOutput,
    WebJumpModifiedDtoOutput,
    WebJumpRetrievedDtoOutput,
} from '../dtos/outputs';
import { WebJump } from '../models';
import { RetrieveWebJumpsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Jump Items')
@Controller('jump-items/web-jumps')
@UsePipes(new ValidationPipe({ transform: true }))
export class WebJumpController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: WebJumpRetrievedDtoOutput, isArray: true })
    public async retrieveWebJumps(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveWebJumpsDtoInput,
    ): Promise<WebJumpRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveWebJumpsQuery, WebJumpRetrievedDtoOutput[]>(
            new RetrieveWebJumpsQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.url,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.jumpointId,
                dtoInput.tag,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({ type: WebJumpCreatedDtoOutput })
    public async createWebJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateWebJumpDtoInput,
    ): Promise<WebJumpCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateWebJumpCommand, WebJump>(
            new CreateWebJumpCommand(
                transactionId,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.url,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.usernameFormatType,
                dtoInput.mustVerifyCertificate,
                dtoInput.authenticationTimeoutInSeconds,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.usernameField,
                dtoInput.passwordField,
                dtoInput.submitField,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiOkResponse({ type: WebJumpModifiedDtoOutput })
    public async modifyWebJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyWebJumpDtoInput,
    ): Promise<WebJumpModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyWebJumpCommand, WebJump>(
            new ModifyWebJumpCommand(
                transactionId,
                id,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.url,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.usernameFormatType,
                dtoInput.mustVerifyCertificate,
                dtoInput.authenticationTimeoutInSeconds,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.usernameField,
                dtoInput.passwordField,
                dtoInput.submitField,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @HttpCode(HttpStatus.NO_CONTENT)
    public async deleteWebJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteWebJumpCommand, void>(new DeleteWebJumpCommand(transactionId, id));
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: WebJumpCopiedDtoOutput })
    @HttpCode(HttpStatus.OK)
    public async copyWebJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: CopyWebJumpDtoInput,
    ): Promise<WebJumpCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyWebJumpCommand, WebJump>(
            new CopyWebJumpCommand(transactionId, id, dtoInput.jumpGroupId, dtoInput.jumpGroupType, dtoInput.name),
        );

        return result;
    }
}
