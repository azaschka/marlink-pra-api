import { SendUserActivationEmailCommandHandler } from './send-user-activation-email.command-handler';
import { SendUserPasswordResetEmailCommandHandler } from './send-user-password-reset-email.command-handler';

export const CommandHandlers = [SendUserActivationEmailCommandHandler, SendUserPasswordResetEmailCommandHandler];
