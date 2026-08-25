import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorProcessorUtility, UrlUtility } from '../../../shared/utilities';
import { SendUserNewPasswordEmailFailedEvent, UserNewPasswordEmailSentEvent } from '../../events';
import { EmailService } from '../../services/email.service';
import { SendUserNewPasswordEmailCommand } from '../send-user-new-password-email.command';
import { AppConfigService } from '../../../app-config/services/app-config.service';

@CommandHandler(SendUserNewPasswordEmailCommand)
export class SendUserNewPasswordEmailCommandHandler implements ICommandHandler<SendUserNewPasswordEmailCommand> {
    private static readonly TEMPLATE = 'user-new-password.mjml';
    private static readonly SUBJECT = 'Your new password for BeyondTrust PRA by Marlink';

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly emailService: EmailService,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: SendUserNewPasswordEmailCommand): Promise<void> {
        try {
            const btConsoleUrl = command.cname
                ? UrlUtility.join(command.cname, 'login')
                : this.appConfigService.beyondTrust.consoleUrl;

            await this.emailService.sendEmail(
                SendUserNewPasswordEmailCommandHandler.TEMPLATE,
                command.sendTo,
                SendUserNewPasswordEmailCommandHandler.SUBJECT,
                {
                    displayName: command.displayName,
                    username: command.username,
                    password: command.password,
                    btConsoleUrl,
                },
            );
            this.eventBus.publish(
                new UserNewPasswordEmailSentEvent(command.transactionId, {
                    email: command.sendTo,
                }),
            );
        } catch (error) {
            console.error(
                `[${command.transactionId}] Failed to send new password email to "${command.sendTo}":`,
                ErrorProcessorUtility.stringify(error),
            );
            this.eventBus.publish(
                new SendUserNewPasswordEmailFailedEvent(command.transactionId, {
                    email: command.sendTo,
                    errorMessage: ErrorProcessorUtility.stringify(error),
                }),
            );
        }
    }
}
