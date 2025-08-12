import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailService } from '../../services/email.service';
import { SendUserPasswordResetEmailCommand } from '../send-user-password-reset-email.command';

@CommandHandler(SendUserPasswordResetEmailCommand)
export class SendUserPasswordResetEmailCommandHandler implements ICommandHandler<SendUserPasswordResetEmailCommand> {
    private static readonly FORGOT_PASSWORD_TEMPLATE = 'user-password-reset.mjml';
    private static readonly FORGOT_PASSWORD_SUBJECT = 'Password Reset';

    constructor(private readonly emailService: EmailService) {}

    public async execute(command: SendUserPasswordResetEmailCommand): Promise<void> {
        await this.emailService.sendEmail(
            SendUserPasswordResetEmailCommandHandler.FORGOT_PASSWORD_TEMPLATE,
            command.sendTo,
            SendUserPasswordResetEmailCommandHandler.FORGOT_PASSWORD_SUBJECT,
            {
                name: command.username,
                expiryMinutes: command.urlExpirationInMinutes,
                resetUrl: command.resetUrl,
            },
        );
    }
}
