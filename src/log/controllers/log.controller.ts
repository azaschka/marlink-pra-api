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
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { ApiExcludeEndpoint, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
// AppConfigService kept here for re-enabling verbose logging — see comments below
// import { AppConfigService } from '../../app-config/services/app-config.service';
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
    constructor(
        // appConfigService kept here for re-enabling verbose logging — see comments below
        // private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly logService: LogService,
    ) {
        this.commandBus.subscribe((command) => {
            // Verbose command logging disabled — uncomment locally if needed for deep debugging
            // if (!this.appConfigService.isProduction) {
            //     console.log(`\x1b[34mCommand received:\n${JSON.stringify(command, null, 2)}\x1b[0m`);
            // }

            void this.logService.logCommand(command);
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.queryBus.subscribe((_query) => {
            // Verbose query logging disabled — uncomment locally if needed for deep debugging
            // if (!this.appConfigService.isProduction) {
            //     console.log(`\x1b[35mQuery received:\n${JSON.stringify(query, null, 2)}\x1b[0m`);
            // }
        });

        this.eventBus.subscribe((event) => {
            // Verbose event logging disabled — uncomment locally if needed for deep debugging
            // if (!this.appConfigService.isProduction) {
            //     console.log(`\x1b[32mEvent received:\n${JSON.stringify(event, null, 2)}\x1b[0m`);
            // }

            void this.logService.logEvent(event);
        });
    }

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
