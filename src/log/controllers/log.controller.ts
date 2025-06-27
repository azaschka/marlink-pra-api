import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RetrieveLogsDtoInput } from '../dtos/inputs';
import { LogRetrievedDtoOutput } from '../dtos/outputs';
import { LogService } from '../repositories/services/log.service';

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
    public async retrieveLogs(@Query() dtoInput: RetrieveLogsDtoInput): Promise<LogRetrievedDtoOutput[]> {
        return this.logService.retrieveLogs(
            dtoInput.pageSize,
            dtoInput.pageNumber,
            dtoInput.creationDateFrom,
            dtoInput.creationDateTo,
            dtoInput.sortOrderType,
        );
    }
}
