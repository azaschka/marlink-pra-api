import { SendPraUserActivationEmailCommandHandler } from './send-pra-user-activation-email.command-handler';
import { SendPraUserNewPasswordEmailCommandHandler } from './send-pra-user-new-password-email.command-handler';
import { SendUserActivationEmailCommandHandler } from './send-user-activation-email.command-handler';
import { SendUserForgotPasswordEmailCommandHandler } from './send-user-forgot-password-email.command-handler';
import { SendUserNewPasswordEmailCommandHandler } from './send-user-new-password-email.command-handler';

export const CommandHandlers = [
    SendPraUserActivationEmailCommandHandler,
    SendPraUserNewPasswordEmailCommandHandler,
    SendUserActivationEmailCommandHandler,
    SendUserForgotPasswordEmailCommandHandler,
    SendUserNewPasswordEmailCommandHandler,
];
