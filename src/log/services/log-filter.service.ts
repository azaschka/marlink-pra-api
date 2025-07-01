import { Injectable } from '@nestjs/common';
import { BaseCommand } from '../../core/commands';

@Injectable()
export class LogFilterService {
    public filterCommand(command: BaseCommand): BaseCommand {
        return command;
    }
}
