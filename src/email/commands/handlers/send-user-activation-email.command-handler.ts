import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailService } from '../../services/email.service';
import { SendUserActivationEmailCommand } from '../send-user-activation-email.command';

@CommandHandler(SendUserActivationEmailCommand)
export class SendUserActivationEmailCommandHandler implements ICommandHandler<SendUserActivationEmailCommand> {
    private static readonly WELCOME_TEMPLATE = 'user-activation.mjml';
    private static readonly WELCOME_SUBJECT = 'Welcome!';

    constructor(private readonly emailService: EmailService) {}

    public async execute(command: SendUserActivationEmailCommand): Promise<void> {
        await this.emailService.sendEmail(
            SendUserActivationEmailCommandHandler.WELCOME_TEMPLATE,
            command.sendTo,
            SendUserActivationEmailCommandHandler.WELCOME_SUBJECT,
            {
                name: command.username,
                activationUrl: command.activationUrl,
            },
        );
    }
}
