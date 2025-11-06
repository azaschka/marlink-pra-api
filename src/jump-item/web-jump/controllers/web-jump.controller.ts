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
    UseGuards,
    UseInterceptors,
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
import { AccessGuard } from '../../../access/guards';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../../core/decorators';
import { CustomersScopeInterceptor } from '../../../customer/interceptors';
import { JumpGroupsScopeInterceptor } from '../../../jump-group/interceptors';
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
import { WebJumpRequestPipe } from '../pipes';
import { RetrieveWebJumpByIdQuery, RetrieveWebJumpsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Jump Items')
@Controller('jump-items/web-jumps')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor, JumpGroupsScopeInterceptor)
@UsePipes(WebJumpRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class WebJumpController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: WebJumpRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveWebJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<WebJumpRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveWebJumpByIdQuery, WebJumpRetrievedDtoOutput>(
            new RetrieveWebJumpByIdQuery(transactionId, tenantId, id),
        );

        return result;
    }

    @Get()
    @ApiOkResponse({ type: WebJumpRetrievedDtoOutput, isArray: true })
    public async retrieveWebJumps(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveWebJumpsDtoInput,
    ): Promise<WebJumpRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveWebJumpsQuery, WebJumpRetrievedDtoOutput[]>(
            new RetrieveWebJumpsQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.url,
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
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateWebJumpDtoInput,
    ): Promise<WebJumpCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateWebJumpCommand, WebJump>(
            new CreateWebJumpCommand(
                transactionId,
                tenantId,
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
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyWebJumpDtoInput,
    ): Promise<WebJumpModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyWebJumpCommand, WebJump>(
            new ModifyWebJumpCommand(
                transactionId,
                tenantId,
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
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteWebJumpCommand, void>(
            new DeleteWebJumpCommand(transactionId, tenantId, id),
        );
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
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: CopyWebJumpDtoInput,
    ): Promise<WebJumpCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyWebJumpCommand, WebJump>(
            new CopyWebJumpCommand(
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
