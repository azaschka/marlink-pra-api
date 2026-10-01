import {
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Logger,
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
import {
    DiscrepancyDtoOutput,
    DiscrepancyOverviewDtoOutput,
    ScanEntityTypeFailureDtoOutput,
    ScanStatusDtoOutput,
} from '../dtos/outputs';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../enums';
import { Discrepancy, DiscrepancyOverview } from '../models';
import { RetrieveDiscrepanciesQuery } from '../queries';
import { DiscrepancyScanStatusService } from '../services/discrepancy-scan-status.service';

@ApiTenantIdHeader()
@ApiTags('Discrepancies')
@Controller('discrepancies')
@UsePipes(MonitoringRequestPipe)
export class DiscrepancyScannerController {
    private static readonly LOGGER = new Logger(DiscrepancyScannerController.name);
    private static readonly ENTITY_TYPE_ORDER: readonly DiscrepancyEntityType[] = [
        DiscrepancyEntityType.User,
        DiscrepancyEntityType.GroupPolicy,
        DiscrepancyEntityType.Team,
        DiscrepancyEntityType.Jumpoint,
        DiscrepancyEntityType.JumpPolicy,
        DiscrepancyEntityType.SessionPolicy,
        DiscrepancyEntityType.JumpGroup,
        DiscrepancyEntityType.JumpItemProtocolTunnelJump,
        DiscrepancyEntityType.JumpItemRemoteRdp,
        DiscrepancyEntityType.JumpItemRemoteVnc,
        DiscrepancyEntityType.JumpItemShellJump,
        DiscrepancyEntityType.JumpItemWebJump,
        DiscrepancyEntityType.JumpClient,
        DiscrepancyEntityType.JumpClientInstaller,
    ];
    private static readonly REASON_MAX_LENGTH = 200;

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

    /**
     * Starts a scan of all entity types in the background and returns its ID. While a manual scan of the tenant is
     * running, the ID of that scan is returned instead of starting a second one.
     */
    @Post('/scan/all')
    @ApiOkResponse({ type: ScanStatusDtoOutput })
    @HttpCode(HttpStatus.ACCEPTED)
    public scanAllDiscrepancies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
    ): Pick<ScanStatusDtoOutput, 'scanId'> {
        const { scanId, started } = this.scanStatusService.begin(tenantId, transactionId);

        if (started) {
            void this.runAllScans(scanId, tenantId);
        } else {
            DiscrepancyScannerController.LOGGER.log(
                `[manual scan ${scanId}] tenant ${tenantId}: already running, returning it for request ${transactionId}`,
            );
        }

        return { scanId };
    }

    @Get('/scan/status/:scanId')
    @ApiParam({ name: 'scanId', type: String, required: true })
    @ApiOkResponse({ type: ScanStatusDtoOutput })
    public getScanStatus(@Param('scanId') scanId: string): ScanStatusDtoOutput {
        return this.scanStatusService.get(scanId);
    }

    private async runAllScans(scanId: string, tenantId: number): Promise<void> {
        const entityTypes = DiscrepancyScannerController.ENTITY_TYPE_ORDER;
        const startedAt = Date.now();
        DiscrepancyScannerController.LOGGER.log(
            `[manual scan ${scanId}] tenant ${tenantId} started (${entityTypes.length} entity types)`,
        );

        try {
            const failures: ScanEntityTypeFailureDtoOutput[] = [];

            for (const entityType of entityTypes) {
                const failure = await this.scanEntityType(scanId, tenantId, entityType);

                if (failure) {
                    failures.push(failure);
                }
            }

            this.scanStatusService.complete(scanId, entityTypes.length, failures);
            const line = `[manual scan ${scanId}] tenant ${tenantId} finished in ${Math.round(
                (Date.now() - startedAt) / 1000,
            )}s: ${entityTypes.length - failures.length} succeeded, ${failures.length} failed${
                failures.length > 0
                    ? ` (${failures
                          .map(
                              (failure) =>
                                  `${failure.entityType}: ${failure.state}${failure.reason ? `, ${failure.reason}` : ''}`,
                          )
                          .join('; ')})`
                    : ''
            }`;

            if (failures.length > 0) {
                DiscrepancyScannerController.LOGGER.warn(line);
            } else {
                DiscrepancyScannerController.LOGGER.log(line);
            }
        } catch (error) {
            DiscrepancyScannerController.LOGGER.error(
                `[manual scan ${scanId}] tenant ${tenantId}: unexpected error: ${DiscrepancyScannerController.describe(error)}`,
            );
            this.scanStatusService.fail(scanId, error);
        }
    }

    /** Scans one entity type; returns why it did not succeed, or undefined. A failing type never stops the others. */
    private async scanEntityType(
        scanId: string,
        tenantId: number,
        entityType: DiscrepancyEntityType,
    ): Promise<ScanEntityTypeFailureDtoOutput | undefined> {
        try {
            const overview = await this.scanDiscrepancies(scanId, tenantId, entityType);

            // Sync API versions before 3.2 send no state; their result counts as succeeded, as before.
            if (overview.state === undefined || overview.state === DiscrepancyScanState.Succeeded) {
                return undefined;
            }

            return { entityType, state: overview.state, reason: overview.failureKind };
        } catch (error) {
            return {
                entityType,
                state: DiscrepancyScanState.Failed,
                reason: DiscrepancyScannerController.describe(error),
            };
        }
    }

    private static describe(error: unknown): string {
        const text =
            error instanceof HttpException
                ? `HTTP ${error.getStatus()}: ${error.message}`
                : error instanceof Error
                  ? error.message
                  : String(error);

        return text.length > DiscrepancyScannerController.REASON_MAX_LENGTH
            ? `${text.slice(0, DiscrepancyScannerController.REASON_MAX_LENGTH - 3)}...`
            : text;
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
