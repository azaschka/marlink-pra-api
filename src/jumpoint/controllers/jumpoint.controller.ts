import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    Res,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AxiosResponse } from 'axios';
import { Response } from 'express';
import { ApiTenantIdHeader, ApiTransactionIdHeader, TenantIdHeader, TransactionIdHeader } from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { ErrorProcessorUtility, UuidUtility } from '../../shared/utilities';
import { CreateJumpointCommand, DeleteJumpointCommand, ModifyJumpointCommand } from '../commands';
import {
    CreateJumpointDtoInput,
    ModifyJumpointDtoInput,
    RetrieveJumpointNodesDtoInput,
    RetrieveJumpointsDtoInput,
} from '../dtos/inputs';
import {
    JumpointCreatedDtoOutput,
    JumpointModifiedDtoOutput,
    JumpointNodeRetrievedDtoOutput,
    JumpointRetrievedDtoOutput,
} from '../dtos/outputs';
import { Jumpoint } from '../models';
import { RetrieveJumpointInstallerQuery, RetrieveJumpointNodesQuery, RetrieveJumpointsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiTags('Jumpoints')
@Controller('jumpoints')
@UsePipes(new ValidationPipe({ transform: true }))
export class JumpointController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: JumpointRetrievedDtoOutput, isArray: true })
    public async retrieveJumpoints(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveJumpointsDtoInput,
    ): Promise<JumpointRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
            new RetrieveJumpointsQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.publicIp,
                dtoInput.privateIp,
                dtoInput.hostname,
                dtoInput.codeName,
                dtoInput.namePattern,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: JumpointCreatedDtoOutput,
        description: 'Indicates the Jumpoint was created successfully and contains the new instance.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createJumpoint(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateJumpointDtoInput,
    ): Promise<JumpointCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateJumpointCommand, Jumpoint>(
            new CreateJumpointCommand(
                transactionId,
                tenantId,
                dtoInput.name,
                dtoInput.platformType,
                dtoInput.codeName,
                dtoInput.comments,
                dtoInput.isEnabled,
                dtoInput.isClustered,
                dtoInput.isShellJumpEnabled,
                dtoInput.externalJumpItemNetworkId,
                dtoInput.isProtocolTunnelEnabled,
                dtoInput.rdpServiceAccountId,
                dtoInput.managedIpRanges,
                dtoInput.isJzpEnabled,
                dtoInput.jzpProxyHostname,
                dtoInput.jzpProxyPort,
                dtoInput.isJzpHttpGetAllowed,
                dtoInput.jzpClientAddressRestrictionsType,
                dtoInput.jzpRestrictedIps,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: JumpointModifiedDtoOutput,
        description: 'Indicates the existing Jumpoint was successfully updated and returns the new Jumpoint.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyJumpoint(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyJumpointDtoInput,
    ): Promise<JumpointModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyJumpointCommand, Jumpoint>(
            new ModifyJumpointCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.name,
                dtoInput.codeName,
                dtoInput.comments,
                dtoInput.isEnabled,
                dtoInput.isShellJumpEnabled,
                dtoInput.externalJumpItemNetworkId,
                dtoInput.isProtocolTunnelEnabled,
                dtoInput.rdpServiceAccountId,
                dtoInput.managedIpRanges,
                dtoInput.isJzpEnabled,
                dtoInput.jzpProxyHostname,
                dtoInput.jzpProxyPort,
                dtoInput.isJzpHttpGetAllowed,
                dtoInput.jzpClientAddressRestrictionsType,
                dtoInput.jzpRestrictedIps,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the jumpoint was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteJumpoint(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteJumpointCommand, void>(
            new DeleteJumpointCommand(transactionId, tenantId, id),
        );
    }

    @Get(':id/nodes')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: [JumpointNodeRetrievedDtoOutput],
        description: 'Indicates the Jumpoint nodes were successfully retrieved.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveJumpointNodes(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Query() dtoInput: RetrieveJumpointNodesDtoInput,
    ): Promise<JumpointNodeRetrievedDtoOutput[]> {
        const result = this.queryBus.execute<RetrieveJumpointNodesQuery, JumpointNodeRetrievedDtoOutput[]>(
            new RetrieveJumpointNodesQuery(transactionId, tenantId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }

    @Get(':id/installer')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    public async retrieveJumpointInstaller(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Res() res: Response,
    ): Promise<void> {
        try {
            const response = await this.queryBus.execute<
                RetrieveJumpointInstallerQuery,
                AxiosResponse<NodeJS.ReadableStream>
            >(new RetrieveJumpointInstallerQuery(transactionId, tenantId, id));

            if (response.headers['content-type']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Type', response.headers['content-type']);
            }
            if (response.headers['content-disposition']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Disposition', response.headers['content-disposition']);
            }
            if (response.headers['content-length']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Length', response.headers['content-length']);
            }

            response.data.pipe(res);
        } catch (error) {
            if (error instanceof HttpException) {
                res.status(error.getStatus()).json({
                    statusCode: error.getStatus(),
                    message: error.message,
                });
            } else {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: ErrorProcessorUtility.stringify(error),
                });
            }
        }
    }
}
