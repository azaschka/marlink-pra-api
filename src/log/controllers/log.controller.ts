import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../../auth/guards';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { DateUtility } from '../../shared/utilities';
import { DeleteLogsDtoInput, RetrieveLogsDtoInput } from '../dtos/inputs';
import { LogsRetrievedDtoOutput } from '../dtos/outputs';
import { LogService } from '../services/log.service';

@ApiTags('Logs')
@Controller('logs')
@UsePipes(MonitoringRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class LogController {
    // Bus subscriptions live in LogBusSubscriberService. MonitoringRequestPipe makes this controller
    // request-scoped, so anything done in this constructor runs again for every request.
    constructor(private readonly logService: LogService) {}

    @Get()
    @ApiOkResponse({ type: LogsRetrievedDtoOutput })
    public async retrieveLogs(@Query() dto: RetrieveLogsDtoInput): Promise<LogsRetrievedDtoOutput> {
        const logs = await this.logService.retrieveLogs(
            dto.pageSize,
            dto.pageNumber,
            dto.searchString,
            dto.creationDateFrom,
            dto.creationDateTo,
            dto.sortOrderType,
            dto.tenantId,
        );

        const totalCount = await this.logService.countLogs(
            dto.searchString,
            dto.creationDateFrom,
            dto.creationDateTo,
            dto.tenantId,
        );

        return { logs, totalCount };
    }

    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site manager was successfully removed.' })
    public async clearLogs(@Query() dto: DeleteLogsDtoInput): Promise<void> {
        await this.logService.clearLogs(
            dto.creationDateFrom,
            dto.creationDateTo ?? DateUtility.getCurrentUtcDate(),
            dto.tenantId,
        );
    }

    /**
     * Administrative maintenance endpoint: purges the entire logs table and
     * resets the AUTO_INCREMENT counter. Hidden from Swagger and protected by
     * the static API key (x-api-key header).
     */
    @Delete('purge')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(ApiKeyAuthGuard)
    @ApiExcludeEndpoint()
    public async purgeAllLogs(): Promise<void> {
        await this.logService.purgeAllLogs();
    }
}
