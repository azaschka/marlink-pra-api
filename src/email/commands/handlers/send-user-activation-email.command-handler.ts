import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorProcessorUtility } from '../../../shared/utilities';
import { SendUserActivationEmailFailedEvent, UserActivationEmailSentEvent } from '../../events';
import { EmailService } from '../../services/email.service';
import { SendUserActivationEmailCommand } from '../send-user-activation-email.command';

@CommandHandler(SendUserActivationEmailCommand)
export class SendUserActivationEmailCommandHandler implements ICommandHandler<SendUserActivationEmailCommand> {
    private static readonly TEMPLATE = 'user-activation.mjml';
    private static readonly SUBJECT = 'Activate your PRA account';

    constructor(
        private readonly emailService: EmailService,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: SendUserActivationEmailCommand): Promise<void> {
        try {
            await this.emailService.sendEmail(
                SendUserActivationEmailCommandHandler.TEMPLATE,
                command.sendTo,
                SendUserActivationEmailCommandHandler.SUBJECT,
                {
                    username: command.username,
                    password: command.password,
                },
            );
            this.eventBus.publish(
                new UserActivationEmailSentEvent(command.transactionId, {
                    email: command.sendTo,
                }),
            );
        } catch (error) {
            this.eventBus.publish(
                new SendUserActivationEmailFailedEvent(command.transactionId, {
                    email: command.sendTo,
                    errorMessage: ErrorProcessorUtility.stringify(error),
                }),
            );
        }
    }
}
