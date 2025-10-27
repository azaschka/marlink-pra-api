import { BadRequestException, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiTenantIdHeader, TenantIdHeader, TransactionIdHeader } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { ScanDiscrepancyCommand } from '../commands';
import { RetrieveDiscrepanciesDtoInput } from '../dtos/inputs';
import { DiscrepancyDtoOutput, DiscrepancyOverviewDtoOutput } from '../dtos/outputs';
import { DiscrepancyEntityType } from '../enums';
import { Discrepancy, DiscrepancyOverview } from '../models';
import { RetrieveDiscrepanciesQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTags('Discrepancies')
@Controller('discrepancies')
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

    @Post('/scan/all')
    @ApiOkResponse()
    @HttpCode(HttpStatus.OK)
    public async scanAllDiscrepancies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
    ): Promise<DiscrepancyOverview[]> {
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

        const scanResults = [];

        for (const entityType of entityTypeOrder) {
            try {
                console.log(`Starting discrepancy scan for ${entityType}.`);

                const scanResult = await this.scanDiscrepancies(transactionId, tenantId, entityType);
                scanResults.push(scanResult);
            } catch (error) {
                console.error(`Discrepancy scan failed for ${entityType}:`, error);
            }
        }

        return scanResults;
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
