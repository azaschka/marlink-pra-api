import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorProcessorUtility } from '../../../shared/utilities';
import { PraUserActivationEmailSentEvent, SendPraUserActivationEmailFailedEvent } from '../../events';
import { EmailService } from '../../services/email.service';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { SendPraUserActivationEmailCommand } from '../send-pra-user-activation-email.command';

@CommandHandler(SendPraUserActivationEmailCommand)
export class SendPraUserActivationEmailCommandHandler implements ICommandHandler<SendPraUserActivationEmailCommand> {
    private static readonly TEMPLATE = 'pra-user-activation.mjml';
    private static readonly SUBJECT = 'Marlink PRA Admin Console – Your Access Details';

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly emailService: EmailService,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: SendPraUserActivationEmailCommand): Promise<void> {
        try {
            const praConsoleUrl = this.appConfigService.praAdminConsole.consoleUrl;

            await this.emailService.sendEmail(
                SendPraUserActivationEmailCommandHandler.TEMPLATE,
                command.sendTo,
                SendPraUserActivationEmailCommandHandler.SUBJECT,
                {
                    displayName: command.displayName,
                    username: command.username,
                    password: command.password,
                    role: command.role,
                    praConsoleUrl,
                },
            );
            this.eventBus.publish(
                new PraUserActivationEmailSentEvent(command.transactionId, {
                    email: command.sendTo,
                }),
            );
        } catch (error) {
            this.eventBus.publish(
                new SendPraUserActivationEmailFailedEvent(command.transactionId, {
                    email: command.sendTo,
                    errorMessage: ErrorProcessorUtility.stringify(error),
                }),
            );
        }
    }
}
