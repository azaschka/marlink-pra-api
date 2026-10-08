import {
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    UsePipes,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiTenantIdHeader, TenantIdHeader, TransactionIdHeader } from '../../core/decorators';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { UuidUtility } from '../../shared/utilities';
import { ScanAllDiscrepanciesCommand, ScanDiscrepancyCommand } from '../commands';
import { RetrieveDiscrepanciesDtoInput } from '../dtos/inputs';
import { DiscrepancyDtoOutput, DiscrepancyOverviewDtoOutput, ScanStatusDtoOutput } from '../dtos/outputs';
import { DiscrepancyEntityType } from '../enums';
import { Discrepancy, DiscrepancyOverview } from '../models';
import { RetrieveDiscrepanciesQuery, RetrieveDiscrepancyScanStatusQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTags('Discrepancies')
@Controller('discrepancies')
@UsePipes(MonitoringRequestPipe)
export class DiscrepancyScannerController {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: DiscrepancyDtoOutput, isArray: true })
    public async retrieveDiscrepancies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveDiscrepanciesDtoInput,
    ): Promise<DiscrepancyDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveDiscrepanciesQuery, Discrepancy[]>(
            new RetrieveDiscrepanciesQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.entityType,
                dtoInput.entityId,
            ),
        );

        return result;
    }

    /**
     * Starts a scan of all entity types in the background and returns its ID. While a manual scan of the tenant is
     * running, the ID of that scan is returned instead of starting a second one.
     */
    @Post('/scan/all')
    @ApiOkResponse({ type: ScanStatusDtoOutput })
    @HttpCode(HttpStatus.ACCEPTED)
    public async scanAllDiscrepancies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
    ): Promise<Pick<ScanStatusDtoOutput, 'scanId'>> {
        return this.commandBus.execute<ScanAllDiscrepanciesCommand, { scanId: string }>(
            new ScanAllDiscrepanciesCommand(transactionId, tenantId),
        );
    }

    @Get('/scan/status/:scanId')
    @ApiParam({ name: 'scanId', type: String, required: true })
    @ApiOkResponse({ type: ScanStatusDtoOutput })
    public async getScanStatus(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('scanId') scanId: string,
    ): Promise<ScanStatusDtoOutput> {
        return this.queryBus.execute<RetrieveDiscrepancyScanStatusQuery, ScanStatusDtoOutput>(
            new RetrieveDiscrepancyScanStatusQuery(transactionId, tenantId, scanId),
        );
    }

    @Post('/scan/:entityType')
    @ApiParam({
        name: 'entityType',
        enum: DiscrepancyEntityType,
        required: true,
        description: 'The type of entity to scan for discrepancies.',
    })
    @ApiOkResponse({ type: DiscrepancyOverviewDtoOutput })
    @HttpCode(HttpStatus.OK)
    public async scanDiscrepancies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('entityType') entityType: DiscrepancyEntityType,
    ): Promise<DiscrepancyOverviewDtoOutput> {
        if (!Object.values(DiscrepancyEntityType).includes(entityType)) {
            throw new BadRequestException(`Invalid entity type: ${entityType}`);
        }

        return await this.commandBus.execute<ScanDiscrepancyCommand, DiscrepancyOverview>(
            new ScanDiscrepancyCommand(transactionId, tenantId, entityType),
        );
    }
}
