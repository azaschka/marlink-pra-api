import { Injectable } from '@nestjs/common';
import { CreateBeyondtrustInstanceBackupCommand } from '../../beyondtrust-instance-backup/commands';
import { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '../../core/commands';
import { AddMonitoringRecordCommand } from '../../monitoring/commands';
import { SendUserForgotPasswordEmailCommand } from '../../email/commands';
import { ObjectUtility } from '../../shared/utilities';
import { CreateUserCommand, ModifyUserCommand } from '../../user/commands';

@Injectable()
export class LogFilterService {
    /**
     * Commands that are not written to the system log. Monitoring records have their own table; logging the
     * command as well doubled the writes of every API request.
     */
    public isExcludedFromLog(command: ICommand): boolean {
        return command instanceof AddMonitoringRecordCommand;
    }

    public filterCommand(command: BaseCommand): BaseCommand {
        if (
            command instanceof CreateUserCommand ||
            command instanceof ModifyUserCommand ||
            command instanceof CreateBeyondtrustInstanceBackupCommand ||
            command instanceof SendUserForgotPasswordEmailCommand
        ) {
            return ObjectUtility.stripProperties(command, 'password');
        }

        return command;
    }
}
