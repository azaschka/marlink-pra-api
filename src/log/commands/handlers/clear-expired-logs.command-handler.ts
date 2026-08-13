import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DateUtility } from '../../../shared/utilities';
import { LogService } from '../../services/log.service';
import { ClearExpiredLogsCommand } from '../clear-expired-logs.command';

@CommandHandler(ClearExpiredLogsCommand)
export class ClearExpiredLogsCommandHandler implements ICommandHandler<ClearExpiredLogsCommand> {
    constructor(private readonly logService: LogService) {}

    public async execute(command: ClearExpiredLogsCommand): Promise<void> {
        const cutoff = DateUtility.subtractDays(DateUtility.getCurrentUtcDate(), command.retentionDays);

        await this.logService.clearLogs(undefined, cutoff);
    }
}
