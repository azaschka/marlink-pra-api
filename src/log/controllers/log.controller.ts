import { Controller, Delete, Get, HttpCode, HttpStatus, Query, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DateUtility } from '../../shared/utilities';
import { DeleteLogsDtoInput, RetrieveLogsDtoInput } from '../dtos/inputs';
import { LogRetrievedDtoOutput } from '../dtos/outputs';
import { LogService } from '../services/log.service';

@ApiTags('Logs')
@Controller('logs')
@UsePipes(new ValidationPipe({ transform: true }))
export class LogController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly logService: LogService,
    ) {
        this.commandBus.subscribe((command) => {
            void this.logService.logCommand(command);
        });

        this.queryBus.subscribe((query) => {
            void this.logService.logQuery(query);
        });

        this.eventBus.subscribe((event) => {
            void this.logService.logEvent(event);
        });
    }

    @Get()
    @ApiOkResponse({ type: LogRetrievedDtoOutput, isArray: true })
    public async retrieveLogs(
        @Query() dto: RetrieveLogsDtoInput,
        @Res({ passthrough: true }) res: Response,
    ): Promise<LogRetrievedDtoOutput[]> {
        const logs = await this.logService.retrieveLogs(
            dto.pageSize,
            dto.pageNumber,
            dto.creationDateFrom,
            dto.creationDateTo,
            dto.sortOrderType,
        );

        const total = await this.logService.countLogs(dto.creationDateFrom, dto.creationDateTo);
        res.set('X-Total-Count', total.toString());

        return logs;
    }

    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site manager was successfully removed.' })
    public async clearLogs(@Query() dto: DeleteLogsDtoInput): Promise<void> {
        await this.logService.clearLogs(dto.creationDateFrom, dto.creationDateTo ?? DateUtility.getCurrentUtcDate());
    }
}
