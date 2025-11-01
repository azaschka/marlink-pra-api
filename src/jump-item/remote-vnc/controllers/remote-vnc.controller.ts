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
    CopyRemoteVncCommand,
    CreateRemoteVncCommand,
    DeleteRemoteVncCommand,
    ModifyRemoteVncCommand,
} from '../commands';
import {
    CopyRemoteVncDtoInput,
    CreateRemoteVncDtoInput,
    ModifyRemoteVncDtoInput,
    RetrieveRemoteVncsDtoInput,
} from '../dtos/inputs';
import {
    RemoteVncCopiedDtoOutput,
    RemoteVncCreatedDtoOutput,
    RemoteVncModifiedDtoOutput,
    RemoteVncRetrievedDtoOutput,
} from '../dtos/outputs';
import { RemoteVnc } from '../models';
import { RetrieveRemoteVncByIdQuery, RetrieveRemoteVncsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiTags('Jump Items')
@Controller('jump-items/remote-vncs')
@UsePipes(new ValidationPipe({ transform: true }))
export class RemoteVncController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: RemoteVncRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<RemoteVncRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveRemoteVncByIdQuery, RemoteVncRetrievedDtoOutput>(
            new RetrieveRemoteVncByIdQuery(transactionId, tenantId, id),
        );

        return result;
    }

    @Get()
    @ApiOkResponse({ type: RemoteVncRetrievedDtoOutput, isArray: true })
    public async retrieveRemoteVncs(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveRemoteVncsDtoInput,
    ): Promise<RemoteVncRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveRemoteVncsQuery, RemoteVncRetrievedDtoOutput[]>(
            new RetrieveRemoteVncsQuery(
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
        type: RemoteVncCreatedDtoOutput,
        description:
            'Indicates the Remote VNC Jump Item was created successfully and contains the new Remote VNC Jump Item instance.',
    })
    @ApiConflictResponse({
        description: 'A Remote VNC Jump Item already exists.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateRemoteVncDtoInput,
    ): Promise<RemoteVncCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateRemoteVncCommand, RemoteVnc>(
            new CreateRemoteVncCommand(
                transactionId,
                tenantId,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.port,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: RemoteVncModifiedDtoOutput,
        description: 'Indicates the existing Remote VNC was successfully updated and returns the Remote VNC.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyRemoteVncDtoInput,
    ): Promise<RemoteVncModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyRemoteVncCommand, RemoteVnc>(
            new ModifyRemoteVncCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.port,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Remote VNC was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteRemoteVncCommand, void>(
            new DeleteRemoteVncCommand(transactionId, tenantId, id),
        );
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: RemoteVncCopiedDtoOutput,
        description: 'Indicates the Remote VNC was successfully copied.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async copyRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: CopyRemoteVncDtoInput,
    ): Promise<RemoteVncCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyRemoteVncCommand, RemoteVnc>(
            new CopyRemoteVncCommand(
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
