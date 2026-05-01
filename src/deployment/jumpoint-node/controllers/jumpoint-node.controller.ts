import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Res,
    UseGuards,
    UseInterceptors,
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
} from '@nestjs/swagger';
import { Response } from 'express';
import { AccessGuard } from '../../../access/guards';
import { BusinessUnitsScopeInterceptor } from '../../../access/interceptors';
import { ApiAccessKeyHeader, ApiTransactionIdHeader, TransactionIdHeader } from '../../../core/decorators';
import { MonitoringRequestPipe } from '../../../monitoring/pipes';
import { UuidUtility } from '../../../shared/utilities';
import {
    ApproveJumpointNodeCommand,
    CreateJumpointNodeCommand,
    CreateJumpointNodeServiceCommand,
    DeleteJumpointNodeCommand,
    DownloadJumpointNodeIsoCommand,
} from '../commands';
import {
    CreateJumpointNodeDtoInput,
    CreateJumpointNodeServiceDtoInput,
    DeploymentRetrieveJumpointNodesDtoInput,
} from '../dtos/inputs';
import {
    JumpointNodeApprovedDtoOutput,
    JumpointNodeCreatedDtoOutput,
    JumpointNodeIsoDownloadedDtoOutput,
    DeploymentJumpointNodeRetrievedDtoOutput,
    JumpointNodeServiceCreatedDtoOutput,
} from '../dtos/outputs';
import { JumpointNodeServiceType } from '../enums';
import { JumpointNode, JumpointNodeIsoContent } from '../models';
import { JumpointNodeRequestPipe } from '../pipes';
import {
    RetrieveJumpointNodeByIdQuery,
    RetrieveJumpointNodeIsoByIdQuery,
    DeploymentRetrieveJumpointNodesQuery,
} from '../queries';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Deployment - Jumpoint Node')
@Controller('deployments/jumpoint-nodes')
@UseGuards(AccessGuard)
@UseInterceptors(BusinessUnitsScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(JumpointNodeRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class JumpointNodeController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: DeploymentJumpointNodeRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveJumpointNode(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<DeploymentJumpointNodeRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveJumpointNodeByIdQuery, JumpointNode>(
            new RetrieveJumpointNodeByIdQuery(transactionId, id),
        );

        return result;
    }

    @Get()
    @ApiOkResponse({ type: DeploymentJumpointNodeRetrievedDtoOutput, isArray: true })
    public async retrieveJumpointNodes(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: DeploymentRetrieveJumpointNodesDtoInput,
    ): Promise<DeploymentJumpointNodeRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<DeploymentRetrieveJumpointNodesQuery, JumpointNode[]>(
            new DeploymentRetrieveJumpointNodesQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.certname,
                dtoInput.businessUnits,
                dtoInput.siteKey,
                dtoInput.customerName,
                dtoInput.puppetServerDomain,
            ),
        );

        return result;
    }

    @Post('deploy')
    @ApiCreatedResponse({
        type: JumpointNodeCreatedDtoOutput,
        description: 'Indicates the Jumpoint node was created successfully and contains the new instance.',
    })
    public async deployJumpointNode(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateJumpointNodeDtoInput,
    ): Promise<JumpointNodeCreatedDtoOutput> {
        const jumpointNode = await this.createJumpointNode(transactionId, dtoInput);
        await this.createJumpointNodeService(transactionId, jumpointNode.id, {
            serviceType: JumpointNodeServiceType.Pra,
        });
        await this.approveJumpointNode(transactionId, jumpointNode.id);

        return await this.downloadJumpointNodeIso(transactionId, jumpointNode.id);
    }

    @Post()
    @ApiCreatedResponse({
        type: JumpointNodeCreatedDtoOutput,
        description: 'Indicates the Jumpoint node was created successfully and contains the new instance.',
    })
    public async createJumpointNode(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateJumpointNodeDtoInput,
    ): Promise<JumpointNodeCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateJumpointNodeCommand, JumpointNode>(
            new CreateJumpointNodeCommand(transactionId, dtoInput.siteKey, dtoInput.businessUnit),
        );

        return result;
    }

    @Post(':id/services')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: JumpointNodeServiceCreatedDtoOutput,
        description: 'Indicates the Jumpoint node service was created successfully.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async createJumpointNodeService(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: CreateJumpointNodeServiceDtoInput,
    ): Promise<JumpointNodeServiceCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateJumpointNodeServiceCommand, JumpointNode>(
            new CreateJumpointNodeServiceCommand(transactionId, id, dtoInput.serviceType),
        );

        return result;
    }

    @Post(':id/approve')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: JumpointNodeApprovedDtoOutput,
        description: 'Indicates the Jumpoint node was approved successfully.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async approveJumpointNode(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<JumpointNodeApprovedDtoOutput> {
        const result = await this.commandBus.execute<ApproveJumpointNodeCommand, JumpointNode>(
            new ApproveJumpointNodeCommand(transactionId, id),
        );

        return result;
    }

    @Post(':id/iso')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: JumpointNodeIsoDownloadedDtoOutput,
        description: 'Indicates the Jumpoint node ISO was downloaded successfully.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async downloadJumpointNodeIso(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<JumpointNodeIsoDownloadedDtoOutput> {
        const result = await this.commandBus.execute<DownloadJumpointNodeIsoCommand, JumpointNode>(
            new DownloadJumpointNodeIsoCommand(transactionId, id),
        );

        return result;
    }

    @Get(':id/iso')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: Buffer, description: 'Returns the content of the ISO file.' })
    @ApiNotFoundResponse({
        description: 'Indicates either the resource or the ISO file was not found.',
    })
    public async retrieveJumpointNodeIso(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Res() res: Response,
    ): Promise<void> {
        const result = await this.queryBus.execute<RetrieveJumpointNodeIsoByIdQuery, JumpointNodeIsoContent>(
            new RetrieveJumpointNodeIsoByIdQuery(transactionId, id),
        );

        res.set({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/x-iso9660-image',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Length': result.buffer.length,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Disposition': `attachment; filename="${result.filename}"`,
        });

        res.send(result.buffer);
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the jumpoint node was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async deleteJumpointNode(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteJumpointNodeCommand, void>(
            new DeleteJumpointNodeCommand(transactionId, id),
        );
    }
}
