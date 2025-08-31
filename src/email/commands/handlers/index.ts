import { SendUserActivationEmailCommandHandler } from './send-user-activation-email.command-handler';
import { SendUserForgotPasswordEmailCommandHandler } from './send-user-forgot-password-email.command-handler';
import { SendUserNewPasswordEmailCommandHandler } from './send-user-new-password-email.command-handler';

export const CommandHandlers = [
    SendUserActivationEmailCommandHandler,
    SendUserForgotPasswordEmailCommandHandler,
    SendUserNewPasswordEmailCommandHandler,
];
