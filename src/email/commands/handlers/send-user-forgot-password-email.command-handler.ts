import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorProcessorUtility } from '../../../shared/utilities';
import { SendUserForgotPasswordEmailFailedEvent, UserForgotPasswordEmailSentEvent } from '../../events';
import { EmailService } from '../../services/email.service';
import { SendUserForgotPasswordEmailCommand } from '../send-user-forgot-password-email.command';

@CommandHandler(SendUserForgotPasswordEmailCommand)
export class SendUserForgotPasswordEmailCommandHandler implements ICommandHandler<SendUserForgotPasswordEmailCommand> {
    private static readonly TEMPLATE = 'user-forgot-password.mjml';
    private static readonly SUBJECT = 'New Password Generated';

    constructor(
        private readonly emailService: EmailService,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: SendUserForgotPasswordEmailCommand): Promise<void> {
        try {
            await this.emailService.sendEmail(
                SendUserForgotPasswordEmailCommandHandler.TEMPLATE,
                command.sendTo,
                SendUserForgotPasswordEmailCommandHandler.SUBJECT,
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
