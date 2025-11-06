import { Controller, Delete, Get, HttpCode, HttpStatus, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { DateUtility } from '../../shared/utilities';
import { DeleteLogsDtoInput, RetrieveLogsDtoInput } from '../dtos/inputs';
import { LogsRetrievedDtoOutput } from '../dtos/outputs';
import { LogService } from '../services/log.service';

@ApiTags('Logs')
@Controller('logs')
@UsePipes(new ValidationPipe({ transform: true }))
export class LogController {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly logService: LogService,
    ) {
        this.commandBus.subscribe((command) => {
            if (!this.appConfigService.isProduction) {
                console.log(`\x1b[34mCommand received:\n${JSON.stringify(command, null, 2)}\x1b[0m`);
            }

            void this.logService.logCommand(command);
        });

        this.queryBus.subscribe((query) => {
            if (!this.appConfigService.isProduction) {
                console.log(`\x1b[35mQuery received:\n${JSON.stringify(query, null, 2)}\x1b[0m`);
            }
        });

        this.eventBus.subscribe((event) => {
            if (!this.appConfigService.isProduction) {
                console.log(`\x1b[32mEvent received:\n${JSON.stringify(event, null, 2)}\x1b[0m`);
            }

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

        return {
            logs: logs,
            totalCount: totalCount,
        };
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
}
