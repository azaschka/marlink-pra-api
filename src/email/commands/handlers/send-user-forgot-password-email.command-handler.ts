import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorProcessorUtility } from '../../../shared/utilities';
import { SendUserForgotPasswordEmailFailedEvent, UserForgotPasswordEmailSentEvent } from '../../events';
import { EmailService } from '../../services/email.service';
import { SendUserForgotPasswordEmailCommand } from '../send-user-forgot-password-email.command';

@CommandHandler(SendUserForgotPasswordEmailCommand)
export class SendUserForgotPasswordEmailCommandHandler implements ICommandHandler<SendUserForgotPasswordEmailCommand> {
    private static readonly FORGOT_PASSWORD_TEMPLATE = 'user-forgot-password.mjml';
    private static readonly FORGOT_PASSWORD_SUBJECT = 'New Password Generated';

    constructor(
        private readonly emailService: EmailService,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: SendUserForgotPasswordEmailCommand): Promise<void> {
        try {
            await this.emailService.sendEmail(
                SendUserForgotPasswordEmailCommandHandler.FORGOT_PASSWORD_TEMPLATE,
                command.sendTo,
                SendUserForgotPasswordEmailCommandHandler.FORGOT_PASSWORD_SUBJECT,
                {
                    username: command.username,
                    password: command.password,
                },
            );

            this.eventBus.publish(
                new UserForgotPasswordEmailSentEvent(command.transactionId, {
                    email: command.sendTo,
                }),
            );
        } catch (error) {
            this.eventBus.publish(
                new SendUserForgotPasswordEmailFailedEvent(command.transactionId, {
                    email: command.sendTo,
                    errorMessage: ErrorProcessorUtility.stringify(error),
                }),
            );
        }
    }
}
