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
import { MonitoringRequestPipe } from '../../../monitoring/pipes';
import { NonEmptyBodyPipe } from '../../../shared/pipes';
import { UuidUtility } from '../../../shared/utilities';
import {
    CopyProtocolTunnelJumpCommand,
    CreateProtocolTunnelJumpCommand,
    DeleteProtocolTunnelJumpCommand,
    ModifyProtocolTunnelJumpCommand,
} from '../commands';
import {
    CopyProtocolTunnelJumpDtoInput,
    CreateProtocolTunnelJumpDtoInput,
    ModifyProtocolTunnelJumpDtoInput,
    RetrieveProtocolTunnelJumpsDtoInput,
} from '../dtos/inputs';
import {
    ProtocolTunnelJumpCopiedDtoOutput,
    ProtocolTunnelJumpCreatedDtoOutput,
    ProtocolTunnelJumpModifiedDtoOutput,
    ProtocolTunnelJumpRetrievedDtoOutput,
} from '../dtos/outputs';
import { ProtocolTunnelJump } from '../models';
import { ProtocolTunnelJumpRequestPipe } from '../pipes';
import { RetrieveProtocolTunnelJumpByIdQuery, RetrieveProtocolTunnelJumpsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Jump Items')
@Controller('jump-items/protocol-tunnel-jumps')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor, JumpGroupsScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(ProtocolTunnelJumpRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class ProtocolTunnelJumpController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: ProtocolTunnelJumpRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveProtocolTunnelJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<ProtocolTunnelJumpRetrievedDtoOutput> {
        const result = await this.queryBus.execute<
            RetrieveProtocolTunnelJumpByIdQuery,
            ProtocolTunnelJumpRetrievedDtoOutput
        >(new RetrieveProtocolTunnelJumpByIdQuery(transactionId, tenantId, id));

        return result;
    }

    @Get()
    @ApiOkResponse({ type: ProtocolTunnelJumpRetrievedDtoOutput, isArray: true })
    public async retrieveProtocolTunnelJumps(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveProtocolTunnelJumpsDtoInput,
    ): Promise<ProtocolTunnelJumpRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<
            RetrieveProtocolTunnelJumpsQuery,
            ProtocolTunnelJumpRetrievedDtoOutput[]
        >(
            new RetrieveProtocolTunnelJumpsQuery(
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
        type: ProtocolTunnelJumpCreatedDtoOutput,
        description:
            'Indicates the Protocol Tunnel Jump Item was created successfully and contains the new Protocol Tunnel Jump Item instance.',
    })
    @ApiConflictResponse({
        description: 'A Protocol Tunnel Jump Item already exists.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createProtocolTunnelJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateProtocolTunnelJumpDtoInput,
    ): Promise<ProtocolTunnelJumpCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateProtocolTunnelJumpCommand, ProtocolTunnelJump>(
            new CreateProtocolTunnelJumpCommand(
                transactionId,
                tenantId,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.sessionPolicyId,
                dtoInput.tunnelListenAddress,
                dtoInput.tunnelDefinitions,
                dtoInput.tunnelType,
                dtoInput.username,
                dtoInput.database,
                dtoInput.url,
                dtoInput.caCertificates,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: ProtocolTunnelJumpModifiedDtoOutput,
        description:
            'Indicates the existing Protocol Tunnel Jump was successfully updated and returns the Protocol Tunnel Jump.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyProtocolTunnelJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyProtocolTunnelJumpDtoInput,
    ): Promise<ProtocolTunnelJumpModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyProtocolTunnelJumpCommand, ProtocolTunnelJump>(
            new ModifyProtocolTunnelJumpCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.sessionPolicyId,
                dtoInput.tunnelListenAddress,
                dtoInput.tunnelDefinitions,
                dtoInput.tunnelType,
                dtoInput.username,
                dtoInput.database,
                dtoInput.url,
                dtoInput.caCertificates,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Protocol Tunnel Jump was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteProtocolTunnelJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteProtocolTunnelJumpCommand, void>(
            new DeleteProtocolTunnelJumpCommand(transactionId, tenantId, id),
        );
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: ProtocolTunnelJumpCopiedDtoOutput,
        description: 'Indicates the Protocol Tunnel Jump was successfully copied.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async copyProtocolTunnelJump(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: CopyProtocolTunnelJumpDtoInput,
    ): Promise<ProtocolTunnelJumpCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyProtocolTunnelJumpCommand, ProtocolTunnelJump>(
            new CopyProtocolTunnelJumpCommand(
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
