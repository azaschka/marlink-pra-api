import { Body, Controller, Get, Param, Post, Query, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CreateBeyondtrustInstanceBackupCommand } from '../commands';
import { CreateBeyondtrustInstanceBackupDtoInput, RetrieveBeyondtrustInstanceBackupsDtoInput } from '../dtos/inputs';
import {
    BeyondtrustInstanceBackupCreatedDtoOutput,
    BeyondtrustInstanceBackupRetrievedDtoOutput,
} from '../dtos/outputs';
import { BeyondtrustInstanceBackup, BeyondtrustInstanceBackupContent } from '../models';
import {
    RetrieveBeyondtrustInstanceBackupByIdQuery,
    RetrieveBeyondtrustInstanceBackupContentQuery,
    RetrieveBeyondtrustInstanceBackupsQuery,
} from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Beyondtrust Instances')
@Controller('beyondtrust-instances')
@UsePipes(MonitoringRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class BeyondtrustInstanceBackupController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id/backups')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: BeyondtrustInstanceBackupRetrievedDtoOutput, isArray: true })
    public async retrieveBeyondtrustInstanceBackups(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Query() dtoInput: RetrieveBeyondtrustInstanceBackupsDtoInput,
    ): Promise<BeyondtrustInstanceBackupRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<
            RetrieveBeyondtrustInstanceBackupsQuery,
            BeyondtrustInstanceBackup[]
        >(new RetrieveBeyondtrustInstanceBackupsQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id));

        return result;
    }

    @Post(':id/backups')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: BeyondtrustInstanceBackupCreatedDtoOutput,
        description: 'Indicates the backup was created successfully created.',
    })
    @ApiNotFoundResponse({
        description: 'Indicates the Beyondtrust instance was not found.',
    })
    public async createBeyondtrustInstanceBackup(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: CreateBeyondtrustInstanceBackupDtoInput,
    ): Promise<BeyondtrustInstanceBackupCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateBeyondtrustInstanceBackupCommand, BeyondtrustInstanceBackup>(
            new CreateBeyondtrustInstanceBackupCommand(transactionId, id, dtoInput.password),
        );

        return result;
    }

    @Get(':id/backups/:backupId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({ name: 'backupId', type: Number, required: true, description: 'Unique identifier for the backup.' })
    @ApiOkResponse({ type: BeyondtrustInstanceBackupRetrievedDtoOutput, isArray: true })
    @ApiNotFoundResponse({
        description: 'Indicates either the resource or the backup was not found.',
    })
    public async retrieveBeyondtrustInstanceBackup(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Param('backupId') backupId: number,
    ): Promise<BeyondtrustInstanceBackupRetrievedDtoOutput> {
        const result = await this.queryBus.execute<
            RetrieveBeyondtrustInstanceBackupByIdQuery,
            BeyondtrustInstanceBackup
        >(new RetrieveBeyondtrustInstanceBackupByIdQuery(transactionId, id, backupId));

        return result;
    }

    @Get(':id/backups/:backupId/content')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({ name: 'backupId', type: Number, required: true, description: 'Unique identifier for the backup.' })
    @ApiOkResponse({ type: Buffer, description: 'Returns the content of the backup file.' })
    @ApiNotFoundResponse({
        description: 'Indicates either the resource or the backup file was not found.',
    })
    public async retrieveBeyondtrustInstanceBackupContent(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Param('backupId') backupId: number,
        @Res() res: Response,
    ): Promise<void> {
        const result = await this.queryBus.execute<
            RetrieveBeyondtrustInstanceBackupContentQuery,
            BeyondtrustInstanceBackupContent
        >(new RetrieveBeyondtrustInstanceBackupContentQuery(transactionId, id, backupId));

        res.set({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/octet-stream',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Length': result.buffer.length,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Disposition': `attachment; filename="${result.filename}"`,
        });

        res.send(result.buffer);
    }
}
