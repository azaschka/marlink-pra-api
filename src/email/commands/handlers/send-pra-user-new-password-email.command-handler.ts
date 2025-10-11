import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorProcessorUtility } from '../../../shared/utilities';
import { PraUserNewPasswordEmailSentEvent, SendPraUserNewPasswordEmailFailedEvent } from '../../events';
import { EmailService } from '../../services/email.service';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { SendPraUserNewPasswordEmailCommand } from '../send-pra-user-new-password-email.command';

@CommandHandler(SendPraUserNewPasswordEmailCommand)
export class SendPraUserNewPasswordEmailCommandHandler implements ICommandHandler<SendPraUserNewPasswordEmailCommand> {
    private static readonly TEMPLATE = 'pra-user-new-password.mjml';
    private static readonly SUBJECT = 'Marlink PRA Admin Console – Your new password';

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly emailService: EmailService,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: SendPraUserNewPasswordEmailCommand): Promise<void> {
        try {
            const praConsoleUrl = this.appConfigService.praAdminConsole.consoleUrl;

            await this.emailService.sendEmail(
                SendPraUserNewPasswordEmailCommandHandler.TEMPLATE,
                command.sendTo,
                SendPraUserNewPasswordEmailCommandHandler.SUBJECT,
                {
                    displayName: command.displayName,
                    username: command.username,
                    password: command.password,
                    praConsoleUrl,
                },
            );
            this.eventBus.publish(
                new PraUserNewPasswordEmailSentEvent(command.transactionId, {
                    email: command.sendTo,
                }),
            );
        } catch (error) {
            this.eventBus.publish(
                new SendPraUserNewPasswordEmailFailedEvent(command.transactionId, {
                    email: command.sendTo,
                    errorMessage: ErrorProcessorUtility.stringify(error),
                }),
            );
        }
    }
}
