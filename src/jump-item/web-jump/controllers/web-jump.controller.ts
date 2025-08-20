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
    @ApiCreatedResponse({
        type: WebJumpCreatedDtoOutput,
        description:
            'Indicates the Web Jump Item was created successfully and contains the new Web Jump Item instance.',
    })
    @ApiConflictResponse({
        description: 'A Web Jump Item already exists.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
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
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: WebJumpModifiedDtoOutput,
        description: 'Indicates the existing Web Jump was successfully updated and returns the Web Jump.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
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
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Web Jump was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteWebJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteWebJumpCommand, void>(new DeleteWebJumpCommand(transactionId, id));
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: WebJumpCopiedDtoOutput,
        description: 'Indicates the Web Jump was successfully copied.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
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
