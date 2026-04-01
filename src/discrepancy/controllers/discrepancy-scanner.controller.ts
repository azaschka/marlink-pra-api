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
import { ScanDiscrepancyCommand } from '../commands';
import { RetrieveDiscrepanciesDtoInput } from '../dtos/inputs';
import { DiscrepancyDtoOutput, DiscrepancyOverviewDtoOutput, ScanStatusDtoOutput } from '../dtos/outputs';
import { DiscrepancyEntityType } from '../enums';
import { Discrepancy, DiscrepancyOverview } from '../models';
import { RetrieveDiscrepanciesQuery } from '../queries';
import { DiscrepancyScanStatusService } from '../services/discrepancy-scan-status.service';

@ApiTenantIdHeader()
@ApiTags('Discrepancies')
@Controller('discrepancies')
@UsePipes(MonitoringRequestPipe)
export class DiscrepancyScannerController {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly scanStatusService: DiscrepancyScanStatusService,
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

    @Post('/scan/all')
    @ApiOkResponse({ type: ScanStatusDtoOutput })
    @HttpCode(HttpStatus.ACCEPTED)
    public scanAllDiscrepancies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
    ): Pick<ScanStatusDtoOutput, 'scanId'> {
        this.scanStatusService.start(transactionId);
        void this.runAllScans(transactionId, tenantId);
        return { scanId: transactionId };
    }

    @Get('/scan/status/:scanId')
    @ApiParam({ name: 'scanId', type: String, required: true })
    @ApiOkResponse({ type: ScanStatusDtoOutput })
    public getScanStatus(@Param('scanId') scanId: string): ScanStatusDtoOutput {
        return this.scanStatusService.get(scanId);
    }

    private async runAllScans(transactionId: string, tenantId: number): Promise<void> {
        const entityTypeOrder = [
            DiscrepancyEntityType.User,
            DiscrepancyEntityType.GroupPolicy,
            DiscrepancyEntityType.Team,
            DiscrepancyEntityType.Jumpoint,
            DiscrepancyEntityType.JumpPolicy,
            DiscrepancyEntityType.JumpGroup,
            DiscrepancyEntityType.JumpItemProtocolTunnelJump,
            DiscrepancyEntityType.JumpItemRemoteRdp,
            DiscrepancyEntityType.JumpItemRemoteVnc,
            DiscrepancyEntityType.JumpItemShellJump,
            DiscrepancyEntityType.JumpItemWebJump,
            DiscrepancyEntityType.JumpClient,
            DiscrepancyEntityType.JumpClientInstaller,
        ];

        try {
            for (const entityType of entityTypeOrder) {
                try {
                    console.log(`[${transactionId}] Starting discrepancy scan for ${entityType}.`);

                    await this.scanDiscrepancies(transactionId, tenantId, entityType);
                } catch (error) {
                    console.error(`[${transactionId}] Discrepancy scan failed for ${entityType}:`, error);
                }
            }

            console.log(`[${transactionId}] All discrepancy scans completed.`);
            this.scanStatusService.complete(transactionId);
        } catch (error) {
            console.error(`[${transactionId}] Unexpected error during discrepancy scan:`, error);
            this.scanStatusService.fail(transactionId, error);
        }
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
