import { Controller, Delete, Get, HttpCode, HttpStatus, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { DateUtility, UuidUtility } from '../../shared/utilities';
import { DeleteMonitoringRecordsCommand } from '../commands';
import { DeleteMonitoringRecordsDtoInput, RetrieveMonitoringRecordsDtoInput } from '../dtos/inputs';
import { MonitoringRecordsRetrievedDtoOutput } from '../dtos/outputs';
import { MonitoringRecord } from '../models';
import { MonitoringRequestPipe } from '../pipes';
import { CountMonitoringRecordsQuery, RetrieveMonitoringRecordsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Monitorings')
@Controller('monitorings')
@UsePipes(MonitoringRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class MonitoringController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: MonitoringRecordsRetrievedDtoOutput })
    public async retrieveMonitoringRecords(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dto: RetrieveMonitoringRecordsDtoInput,
    ): Promise<MonitoringRecordsRetrievedDtoOutput> {
        const totalRecords = await this.queryBus.execute<CountMonitoringRecordsQuery, number>(
            new CountMonitoringRecordsQuery(transactionId, dto.creationDateFrom, dto.creationDateTo),
        );
        const records = await this.queryBus.execute<RetrieveMonitoringRecordsQuery, MonitoringRecord[]>(
            new RetrieveMonitoringRecordsQuery(
                transactionId,
                dto.pageSize,
                dto.pageNumber,
                dto.creationDateFrom,
                dto.creationDateTo,
                dto.sortOrderType,
            ),
        );

        return {
            totalCount: totalRecords,
            monitoringRecords: records,
        };
    }

    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the monitoring records were successfully removed.' })
    public async deleteMonitoringRecords(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dto: DeleteMonitoringRecordsDtoInput,
    ): Promise<void> {
        await this.commandBus.execute(
            new DeleteMonitoringRecordsCommand(
                transactionId,
                dto.creationDateFrom,
                dto.creationDateTo ?? DateUtility.getCurrentUtcDate(),
            ),
        );
    }
}
