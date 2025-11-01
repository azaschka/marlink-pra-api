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
    CopyRemoteRdpCommand,
    CreateRemoteRdpCommand,
    DeleteRemoteRdpCommand,
    ModifyRemoteRdpCommand,
} from '../commands';
import {
    CopyRemoteRdpDtoInput,
    CreateRemoteRdpDtoInput,
    ModifyRemoteRdpDtoInput,
    RetrieveRemoteRdpsDtoInput,
} from '../dtos/inputs';
import {
    RemoteRdpCopiedDtoOutput,
    RemoteRdpCreatedDtoOutput,
    RemoteRdpModifiedDtoOutput,
    RemoteRdpRetrievedDtoOutput,
} from '../dtos/outputs';
import { RemoteRdp } from '../models';
import { RetrieveRemoteRdpByIdQuery, RetrieveRemoteRdpsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiTags('Jump Items')
@Controller('jump-items/remote-rdps')
@UsePipes(new ValidationPipe({ transform: true }))
export class RemoteRdpController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: RemoteRdpRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveRemoteRdp(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<RemoteRdpRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveRemoteRdpByIdQuery, RemoteRdpRetrievedDtoOutput>(
            new RetrieveRemoteRdpByIdQuery(transactionId, tenantId, id),
        );

        return result;
    }

    @Get()
    @ApiOkResponse({ type: RemoteRdpRetrievedDtoOutput, isArray: true })
    public async retrieveRemoteRdps(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveRemoteRdpsDtoInput,
    ): Promise<RemoteRdpRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveRemoteRdpsQuery, RemoteRdpRetrievedDtoOutput[]>(
            new RetrieveRemoteRdpsQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.hostname,
                dtoInput.jumpGroupIds,
                dtoInput.jumpGroupType,
                dtoInput.jumpointId,
                dtoInput.endpointId,
                dtoInput.tag,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: RemoteRdpCreatedDtoOutput,
        description:
            'Indicates the Remote RDP Jump Item was created successfully and contains the new Remote RDP Jump Item instance.',
    })
    @ApiConflictResponse({
        description: 'A Remote RDP Jump Item already exists.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createRemoteRdp(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateRemoteRdpDtoInput,
    ): Promise<RemoteRdpCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateRemoteRdpCommand, RemoteRdp>(
            new CreateRemoteRdpCommand(
                transactionId,
                tenantId,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.qualityMode,
                dtoInput.mustStartNewConsoleSession,
                dtoInput.mustIgnoreUntrustedServerCert,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.rdpUsername,
                dtoInput.domain,
                dtoInput.jumpPolicyId,
                dtoInput.isSessionForensicsEnabled,
                dtoInput.sessionPolicyId,
                dtoInput.secureAppType,
                dtoInput.remoteAppName,
                dtoInput.remoteAppParams,
                dtoInput.remoteExePath,
                dtoInput.remoteExeParams,
                dtoInput.targetSystem,
                dtoInput.credentialType,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: RemoteRdpModifiedDtoOutput,
        description: 'Indicates the existing Remote RDP was successfully updated and returns the Remote RDP.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyRemoteRdp(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyRemoteRdpDtoInput,
    ): Promise<RemoteRdpModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyRemoteRdpCommand, RemoteRdp>(
            new ModifyRemoteRdpCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.qualityMode,
                dtoInput.mustStartNewConsoleSession,
                dtoInput.mustIgnoreUntrustedServerCert,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.rdpUsername,
                dtoInput.domain,
                dtoInput.jumpPolicyId,
                dtoInput.isSessionForensicsEnabled,
                dtoInput.sessionPolicyId,
                dtoInput.secureAppType,
                dtoInput.remoteAppName,
                dtoInput.remoteAppParams,
                dtoInput.remoteExePath,
                dtoInput.remoteExeParams,
                dtoInput.targetSystem,
                dtoInput.credentialType,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Remote RDP was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteRemoteRdp(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteRemoteRdpCommand, void>(
            new DeleteRemoteRdpCommand(transactionId, tenantId, id),
        );
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: RemoteRdpCopiedDtoOutput,
        description: 'Indicates the Remote RDP was successfully copied.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async copyRemoteRdp(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: CopyRemoteRdpDtoInput,
    ): Promise<RemoteRdpCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyRemoteRdpCommand, RemoteRdp>(
            new CopyRemoteRdpCommand(
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
