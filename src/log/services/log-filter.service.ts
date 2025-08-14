import { Injectable } from '@nestjs/common';
import { CreateBeyondtrustInstanceBackupCommand } from '../../beyondtrust-instance-backup/commands';
import { BaseCommand } from '../../core/commands';
import { SendUserForgotPasswordEmailCommand } from '../../email/commands';
import { ObjectUtility } from '../../shared/utilities';
import { CreateUserCommand, ModifyUserCommand } from '../../user/commands';

@Injectable()
export class LogFilterService {
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
