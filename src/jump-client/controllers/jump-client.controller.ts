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
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { JumpGroupsScopeInterceptor } from '../../jump-group/interceptors';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CopyJumpClientCommand, DeleteJumpClientCommand, ModifyJumpClientCommand } from '../commands';
import { CopyJumpClientDtoInput, ModifyJumpClientDtoInput, RetrieveJumpClientsDtoInput } from '../dtos/inputs';
import { JumpClientCopiedDtoOutput, JumpClientModifiedDtoOutput, JumpClientRetrievedDtoOutput } from '../dtos/outputs';
import { JumpClient } from '../models';
import { JumpClientRequestPipe } from '../pipes';
import { RetrieveJumpClientByIdQuery, RetrieveJumpClientsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Jump Clients')
@Controller('jump-clients')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor, JumpGroupsScopeInterceptor)
@UsePipes(JumpClientRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class JumpClientController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: JumpClientRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveJumpClient(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<JumpClientRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveJumpClientByIdQuery, JumpClientRetrievedDtoOutput>(
            new RetrieveJumpClientByIdQuery(transactionId, tenantId, id),
        );

        return result;
    }

    @Get()
    @ApiOkResponse({ type: JumpClientRetrievedDtoOutput, isArray: true })
    public async retrieveJumpClients(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveJumpClientsDtoInput,
    ): Promise<JumpClientRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveJumpClientsQuery, JumpClientRetrievedDtoOutput[]>(
            new RetrieveJumpClientsQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.hostname,
                dtoInput.fqdn,
                dtoInput.tag,
                dtoInput.jumpGroupIds,
                dtoInput.jumpGroupType,
                dtoInput.consoleUser,
                dtoInput.publicIp,
                dtoInput.privateIp,
                dtoInput.connectionType,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: JumpClientModifiedDtoOutput,
        description: 'Indicates the existing Jump Client was successfully updated and returns the Jump Client.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyJumpClient(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyJumpClientDtoInput,
    ): Promise<JumpClientModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyJumpClientCommand, JumpClient>(
            new ModifyJumpClientCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.name,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.sessionPolicyId,
                dtoInput.maxOfflineDurationInMinutes,
                dtoInput.endpointAgreementPolicyType,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Jump Client was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteJumpClient(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteJumpClientCommand, void>(
            new DeleteJumpClientCommand(transactionId, tenantId, id),
        );
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: JumpClientCopiedDtoOutput,
        description: 'Indicates the Jump Client was successfully copied.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async copyJumpClient(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: CopyJumpClientDtoInput,
    ): Promise<JumpClientCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyJumpClientCommand, JumpClient>(
            new CopyJumpClientCommand(
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
